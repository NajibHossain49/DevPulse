import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Post,
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
import { StandupDto } from "./dto/standup.dto";
import { InsightsDto } from "./dto/insights.dto";
import { BatchAnalyzeDto } from "./dto/batch-analyze.dto";
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
