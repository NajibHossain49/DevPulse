import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { AlertsService } from "./alerts.service";

@ApiTags("alerts")
@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get anomaly alerts for the current user" })
  async getAlerts(
    @CurrentUser("id") userId: string,
    @Query("projectId") projectId?: string,
  ) {
    return this.alertsService.getAlerts(userId, projectId);
  }
}
