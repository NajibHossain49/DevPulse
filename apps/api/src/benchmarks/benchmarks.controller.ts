import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { BenchmarksService } from "./benchmarks.service";

@ApiTags("benchmarks")
@ApiBearerAuth()
@Controller("benchmarks")
@UseGuards(AuthGuard)
export class BenchmarksController {
  constructor(private readonly benchmarksService: BenchmarksService) {}

  @Get()
  @ApiOperation({ summary: "Get comparative benchmarks for a project" })
  async getBenchmarks(@Query("projectId") projectId: string) {
    return this.benchmarksService.getBenchmarks(projectId);
  }
}
