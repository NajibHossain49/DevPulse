import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiBearerAuth()
@Controller("reports")
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: "Generate an on-demand report for a project" })
  async generateReport(
    @Query("projectId") projectId: string,
    @Query("period") period: "7d" | "30d" = "7d",
  ) {
    return this.reportsService.generateReport(
      projectId,
      period === "30d" ? "30d" : "7d",
    );
  }

  @Post("send")
  @ApiOperation({ summary: "Email a project report to the current user" })
  async sendReport(
    @Query("projectId") projectId: string,
    @CurrentUser("email") email: string,
    @Query("email") overrideEmail?: string,
  ) {
    return this.reportsService.sendProjectReport(
      projectId,
      overrideEmail || email,
    );
  }
}
