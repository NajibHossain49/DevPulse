import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { AnalyticsService, ProjectMetrics } from "./analytics.service";
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
