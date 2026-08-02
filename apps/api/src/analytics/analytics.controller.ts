import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { AnalyticsService, ProjectMetrics } from "./analytics.service";
import { DoraService } from "./dora.service";
import { RedisService } from "../redis/redis.service";
import { PrismaService } from "../prisma/prisma.service";

const DAY_MS = 24 * 60 * 60 * 1000;

@ApiTags("analytics")
@ApiBearerAuth()
@Controller("analytics")
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly doraService: DoraService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Project metrics for a period (cached)" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMetrics(
    @Query("projectId") projectId: string,
    @Query("period") period = "30d",
  ) {
    const { startDate, endDate } = parsePeriod(period);
    const cacheKey = `analytics:${projectId}:${period}`;

    const cached = await this.redisService.get<ProjectMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    const metrics = await this.analyticsService.getProjectMetrics(
      projectId,
      startDate,
      endDate,
    );

    await this.redisService.set(cacheKey, metrics, 3600);
    return metrics;
  }

  @Get("contributors")
  @ApiOperation({ summary: "Contributor stats for a period" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getContributors(
    @Query("projectId") projectId: string,
    @Query("period") period = "30d",
  ) {
    const { startDate, endDate } = parsePeriod(period);
    return this.analyticsService.getContributorStats(
      projectId,
      startDate,
      endDate,
    );
  }

  @Get("velocity")
  @ApiOperation({ summary: "Weekly velocity trend" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getVelocity(
    @Query("projectId") projectId: string,
    @Query("weeks") weeks?: string,
  ) {
    const parsedWeeks = weeks ? parseInt(weeks, 10) : 8;
    return this.analyticsService.getVelocityTrend(
      projectId,
      Number.isFinite(parsedWeeks) && parsedWeeks > 0 ? parsedWeeks : 8,
    );
  }

  @Get("review-time")
  @ApiOperation({ summary: "Review time distribution buckets" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getReviewTime(@Query("projectId") projectId: string) {
    return this.analyticsService.getReviewTimeDistribution(projectId);
  }

  @Get("dora")
  @ApiOperation({ summary: "DORA metrics (DevOps Research and Assessment)" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getDoraMetrics(
    @Query("projectId") projectId: string,
    @Query("weeks") weeks?: string,
  ) {
    const parsedWeeks = weeks ? parseInt(weeks, 10) : 4;
    return this.doraService.calculateDoraMetrics(
      projectId,
      Number.isFinite(parsedWeeks) && parsedWeeks > 0 ? parsedWeeks : 4,
    );
  }

  @Get("personal")
  @ApiOperation({ summary: "Personal development stats for the current user" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getPersonalStats(
    @CurrentUser() user: { id: string; name?: string | null; email: string },
    @Query("projectId") projectId?: string,
    @Query("days") days = "7",
  ) {
    const parsedDays = Math.max(1, parseInt(days, 10) || 7);
    const since = new Date(Date.now() - parsedDays * DAY_MS);
    const candidates = [user.name, user.email.split("@")[0]]
      .filter((v): v is string => !!v)
      .map((v) => v.toLowerCase());

    const projectFilter = projectId
      ? { projectId }
      : {
          project: {
            team: {
              OR: [
                { ownerId: user.id },
                { members: { some: { userId: user.id } } },
              ],
            },
          },
        };

    const [commits, prs] = await Promise.all([
      this.prisma.commit.findMany({
        where: { ...projectFilter, createdAt: { gte: since } },
      }),
      this.prisma.pullRequest.findMany({
        where: { ...projectFilter, createdAt: { gte: since } },
      }),
    ]);

    const myCommits = commits.filter((c) =>
      candidates.includes((c.author ?? "").toLowerCase()),
    );
    const myPrs = prs.filter((p) =>
      candidates.includes((p.author ?? "").toLowerCase()),
    );
    const reviewTimes = myPrs
      .map((p) => p.reviewTime)
      .filter((v): v is number => v !== null);

    return {
      commits: myCommits.length,
      prsOpened: myPrs.length,
      prsMerged: myPrs.filter((p) => p.state === "merged").length,
      avgReviewTime:
        reviewTimes.length > 0
          ? Math.round(
              reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length,
            )
          : null,
      linesAdded: myCommits.reduce((sum, c) => sum + c.additions, 0),
      linesDeleted: myCommits.reduce((sum, c) => sum + c.deletions, 0),
    };
  }

  @Get("quick-stats")
  @ApiOperation({ summary: "Quick stats for browser extension popup" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getQuickStats(
    @CurrentUser() user: { id: string; name?: string | null; email: string },
  ) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const candidates = [user.name, user.email.split("@")[0]]
      .filter((v): v is string => !!v)
      .map((v) => v.toLowerCase());

    const teamFilter = {
      project: {
        team: {
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        },
      },
    };

    const [commits, openPrs] = await Promise.all([
      this.prisma.commit.findMany({
        where: { ...teamFilter, createdAt: { gte: startOfDay } },
        select: { author: true },
      }),
      this.prisma.pullRequest.count({
        where: { ...teamFilter, state: "open" },
      }),
    ]);

    const commitsToday = commits.filter((c) =>
      candidates.includes((c.author ?? "").toLowerCase()),
    ).length;

    return { commitsToday, openPRs: openPrs };
  }

  @Get("timeline")
  @ApiOperation({ summary: "Recent pull requests timeline (last 100)" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getTimeline(@Query("projectId") projectId: string) {
    return this.prisma.pullRequest.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        author: true,
        state: true,
        createdAt: true,
        mergedAt: true,
        reviewTime: true,
        aiQualityScore: true,
      },
    });
  }
}

function parsePeriod(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const startDate = new Date(endDate.getTime() - days * DAY_MS);
  return { startDate, endDate };
}
