import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { GoalsService } from "./goals.service";
import { CreateGoalDto } from "./dto/create-goal.dto";

@ApiTags("goals")
@ApiBearerAuth()
@Controller("goals")
@UseGuards(AuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new goal" })
  async createGoal(@Body() dto: CreateGoalDto) {
    return this.goalsService.createGoal(dto.teamId, {
      title: dto.title,
      description: dto.description,
      metric: dto.metric,
      target: dto.target,
      deadline: new Date(dto.deadline),
    });
  }

  @Get()
  @ApiOperation({ summary: "Get team goals" })
  async getGoals(@Query("teamId") teamId: string) {
    return this.goalsService.getGoals(teamId);
  }

  @Post(":id/progress")
  @ApiOperation({ summary: "Recompute goal progress" })
  async updateProgress(@Param("id") goalId: string) {
    return this.goalsService.updateGoalProgress(goalId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete goal" })
  async deleteGoal(@Param("id") goalId: string) {
    return this.goalsService.deleteGoal(goalId);
  }
}
