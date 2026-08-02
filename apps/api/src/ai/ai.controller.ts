import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  forwardRef,
  Get,
  Inject,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { GithubService } from "../github/github.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AiService, PrAnalysis } from "./ai.service";
import { AnalyzePrDto } from "./dto/analyze-pr.dto";
import { AnalyzePrUrlDto } from "./dto/analyze-pr-url.dto";
import { StandupDto } from "./dto/standup.dto";
import { InsightsDto } from "./dto/insights.dto";
import { BatchAnalyzeDto } from "./dto/batch-analyze.dto";
import { SprintPredictDto } from "./dto/sprint-predict.dto";
import { UsageGuard } from "../usage/usage.guard";
import { UsageLimit } from "../usage/usage.decorator";
import { UsageService } from "../usage/usage.service";

const PR_CACHE_TTL = 86400; // 24 hours
const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 5;

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
@UseGuards(AuthGuard, UsageGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => GithubService))
    private readonly githubService: GithubService,
    private readonly analyticsService: AnalyticsService,
    private readonly usageService: UsageService,
  ) {}

  @Post("analyze")
  @UsageLimit("ai_analysis")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Analyze a single PR with AI (cached 24h)" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden / limit exceeded" })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async analyze(
    @CurrentUser("id") userId: string,
    @Body() dto: AnalyzePrDto,
  ) {
    const cacheKey = `ai:pr:${dto.prId}`;
    const cached = await this.redisService.get<PrAnalysis>(cacheKey);
    if (cached) {
      return cached;
    }

    const project = await this.assertProjectAccess(userId, dto.projectId);

    const pr = await this.prisma.pullRequest.findUnique({
      where: { id: dto.prId },
      include: { project: true },
    });
    if (!pr || pr.projectId !== dto.projectId) {
      throw new NotFoundException("Pull request not found");
    }

    const result = await this.runPrAnalysis(
      pr.project.githubRepo,
      pr.id,
      pr.number,
      pr.title,
      pr.body,
    );

    await this.redisService.set(cacheKey, result, PR_CACHE_TTL);
    await this.usageService.incrementUsage(project.teamId, "ai_analysis");
    return result;
  }

  @Post("standup")
  @ApiOperation({ summary: "Generate a standup update for a user" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async standup(
    @CurrentUser("id") userId: string,
    @Body() dto: StandupDto,
  ) {
    await this.assertProjectAccess(userId, dto.projectId);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.userEmail },
    });
    if (!user) {
      throw new NotFoundException(
        `No user found with email ${dto.userEmail}`,
      );
    }

    const days = dto.days && dto.days > 0 ? dto.days : 1;
    const since = new Date(Date.now() - days * DAY_MS);

    // NOTE: The User model does not store a GitHub login, and commits/PRs are
    // keyed by GitHub login. We best-effort match on the user's name or the
    // email local-part (case-insensitive).
    const candidates = [user.name, dto.userEmail.split("@")[0]]
      .filter((v): v is string => !!v)
      .map((v) => v.toLowerCase());

    const [allCommits, allPrs] = await Promise.all([
      this.prisma.commit.findMany({
        where: { projectId: dto.projectId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.pullRequest.findMany({
        where: { projectId: dto.projectId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const commits = allCommits.filter((c) =>
      candidates.includes((c.author ?? "").toLowerCase()),
    );
    const prs = allPrs.filter((p) =>
      candidates.includes((p.author ?? "").toLowerCase()),
    );

    const standup = await this.aiService.generateStandup(
      commits,
      prs,
      user.name ?? dto.userEmail,
    );

    return { standup };
  }

  @Post("insights")
  @ApiOperation({ summary: "Generate AI insights from 30-day metrics" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async insights(
    @CurrentUser("id") userId: string,
    @Body() dto: InsightsDto,
  ) {
    await this.assertProjectAccess(userId, dto.projectId);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * DAY_MS);
    const metrics = await this.analyticsService.getProjectMetrics(
      dto.projectId,
      startDate,
      endDate,
    );

    const insights = await this.aiService.generateInsights(metrics);
    return { insights };
  }

  @Post("batch-analyze")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: "Analyze all un-scored PRs in batches of 5" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async batchAnalyze(
    @CurrentUser("id") userId: string,
    @Body() dto: BatchAnalyzeDto,
  ) {
    const project = await this.assertProjectAccess(userId, dto.projectId);

    const pending = await this.prisma.pullRequest.findMany({
      where: { projectId: dto.projectId, aiQualityScore: null },
    });

    let analyzed = 0;
    let failed = 0;

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (pr) => {
          const result = await this.runPrAnalysis(
            project.githubRepo,
            pr.id,
            pr.number,
            pr.title,
            pr.body,
          );
          await this.redisService.set(
            `ai:pr:${pr.id}`,
            result,
            PR_CACHE_TTL,
          );
        }),
      );

      for (const r of results) {
        if (r.status === "fulfilled") analyzed++;
        else failed++;
      }
    }

    return { analyzed, failed };
  }

  @Get("analyze-pr")
  @UsageLimit("ai_analysis")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Analyze a GitHub PR by owner/repo/number (browser ext)" })
  @ApiResponse({ status: 200, description: "Success" })
  async analyzePrByQuery(
    @CurrentUser("id") userId: string,
    @Query("owner") owner: string,
    @Query("repo") repo: string,
    @Query("pr") pr: string,
  ) {
    return this.analyzeByGithubRef(userId, owner, repo, pr);
  }

  @Post("analyze-pr")
  @UsageLimit("ai_analysis")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Analyze a GitHub PR by URL (CLI)" })
  @ApiResponse({ status: 200, description: "Success" })
  async analyzePrByUrl(
    @CurrentUser("id") userId: string,
    @Body() dto: AnalyzePrUrlDto,
  ) {
    if (dto.prUrl) {
      const match = dto.prUrl.match(
        /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i,
      );
      if (!match) {
        throw new BadRequestException(
          "prUrl must look like https://github.com/owner/repo/pull/123",
        );
      }
      return this.analyzeByGithubRef(userId, match[1], match[2], match[3]);
    }
    if (dto.owner && dto.repo && dto.pr) {
      return this.analyzeByGithubRef(userId, dto.owner, dto.repo, dto.pr);
    }
    throw new BadRequestException("Provide prUrl or owner/repo/pr");
  }

  @Post("sprint-predict")
  @ApiOperation({ summary: "Predict sprint completion probability" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async predictSprint(
    @CurrentUser("id") userId: string,
    @Body() dto: SprintPredictDto,
  ) {
    await this.assertProjectAccess(userId, dto.projectId);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * DAY_MS);
    const metrics = await this.analyticsService.getProjectMetrics(
      dto.projectId,
      startDate,
      endDate,
    );

    const openPRs = await this.prisma.pullRequest.count({
      where: { projectId: dto.projectId, state: "open" },
    });

    const daysRemaining = Math.ceil(
      (new Date(dto.sprintEndDate).getTime() - Date.now()) / DAY_MS,
    );

    return this.aiService.predictSprint({
      velocity: metrics.totalPRs / 4, // PRs per week over ~30 days
      openPRs,
      targetPRs: dto.targetPRs,
      avgReviewTime: metrics.avgReviewTime,
      daysRemaining,
    });
  }

  private async analyzeByGithubRef(
    userId: string,
    owner: string,
    repo: string,
    prNumberRaw: string,
  ): Promise<PrAnalysis> {
    const prNumber = parseInt(prNumberRaw, 10);
    if (!Number.isFinite(prNumber)) {
      throw new BadRequestException("Invalid PR number");
    }

    const githubRepo = `${owner}/${repo}`;
    const project = await this.prisma.project.findFirst({
      where: {
        githubRepo: { equals: githubRepo, mode: "insensitive" },
        team: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
      },
    });
    if (!project) {
      throw new NotFoundException(
        `No DevPulse project linked to ${githubRepo}`,
      );
    }

    const pr = await this.prisma.pullRequest.findFirst({
      where: { projectId: project.id, number: prNumber },
    });
    if (!pr) {
      throw new NotFoundException(
        `PR #${prNumber} not synced yet. Run Sync Now for this project.`,
      );
    }

    const cacheKey = `ai:pr:${pr.id}`;
    const cached = await this.redisService.get<PrAnalysis>(cacheKey);
    if (cached) return cached;

    const result = await this.runPrAnalysis(
      project.githubRepo,
      pr.id,
      pr.number,
      pr.title,
      pr.body,
    );
    await this.redisService.set(cacheKey, result, PR_CACHE_TTL);
    await this.usageService.incrementUsage(project.teamId, "ai_analysis");
    return result;
  }

  private async runPrAnalysis(
    repo: string,
    prId: string,
    prNumber: number,
    title: string,
    body: string | null,
  ): Promise<PrAnalysis> {
    const files = await this.githubService.getPullRequestFiles(
      repo,
      prNumber,
    );
    const diff = files
      .map((f) => `--- ${f.filename}\n${f.patch ?? ""}`)
      .join("\n\n");

    const result = await this.aiService.analyzePullRequest(diff, title, body);

    await this.prisma.pullRequest.update({
      where: { id: prId },
      data: { aiSummary: result.summary, aiQualityScore: result.score },
    });

    return result;
  }

  private async assertProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { team: { include: { members: true } } },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const { team } = project;
    const hasAccess =
      team.ownerId === userId ||
      team.members.some((m) => m.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this project");
    }

    return project;
  }
}
