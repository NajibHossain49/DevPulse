import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { WellnessService } from "./wellness.service";

@ApiTags("wellness")
@Controller("wellness")
export class WellnessController {
  constructor(private readonly wellnessService: WellnessService) {}

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get my wellness score" })
  async getMyWellness(
    @CurrentUser("id") userId: string,
    @Query("weeks") weeks?: string,
  ) {
    return this.wellnessService.getWellnessScore(
      userId,
      undefined,
      weeks ? parseInt(weeks, 10) : 4,
    );
  }

  @Get("team")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get team wellness overview" })
  async getTeamWellness(
    @Query("teamId") teamId: string,
    @Query("weeks") weeks?: string,
  ) {
    return this.wellnessService.getTeamWellness(
      teamId,
      weeks ? parseInt(weeks, 10) : 4,
    );
  }
}
