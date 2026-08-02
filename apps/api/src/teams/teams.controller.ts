import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { TeamsService } from "./teams.service";
import { CreateTeamDto } from "./dto/create-team.dto";

@Controller("teams")
@UseGuards(AuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  createTeam(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(userId, dto);
  }

  @Get()
  getMyTeams(@CurrentUser("id") userId: string) {
    return this.teamsService.getMyTeams(userId);
  }

  @Get(":id")
  getTeam(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.teamsService.getTeam(userId, id);
  }

  @Delete(":id")
  deleteTeam(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.teamsService.deleteTeam(userId, id);
  }
}
