import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { GamificationService } from "./gamification.service";

@ApiTags("gamification")
@ApiBearerAuth()
@Controller("gamification")
@UseGuards(AuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get("achievements")
  @ApiOperation({ summary: "Get user achievements" })
  async getAchievements(@CurrentUser("id") userId: string) {
    return this.gamificationService.getAchievements(userId);
  }

  @Post("check")
  @ApiOperation({ summary: "Check for new achievements" })
  async checkAchievements(@CurrentUser("id") userId: string) {
    const newAchievements =
      await this.gamificationService.checkAchievements(userId);
    return { newAchievements, count: newAchievements.length };
  }

  @Get("leaderboard")
  @ApiOperation({ summary: "Get team leaderboard" })
  async getLeaderboard(
    @Query("teamId") teamId: string,
    @Query("metric") metric = "prs_merged",
    @Query("period") period?: string,
  ) {
    return this.gamificationService.getLeaderboard(teamId, metric, period);
  }
}
