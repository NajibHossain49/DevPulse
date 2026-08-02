import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { TeamsService } from "./teams.service";
import { CreateTeamDto } from "./dto/create-team.dto";

@ApiTags("teams")
@ApiBearerAuth()
@Controller("teams")
@UseGuards(AuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: "Create a team" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  createTeam(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List teams the current user belongs to" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getMyTeams(@CurrentUser("id") userId: string) {
    return this.teamsService.getMyTeams(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a team by id" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getTeam(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.teamsService.getTeam(userId, id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a team (owner only)" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  deleteTeam(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.teamsService.deleteTeam(userId, id);
  }
}
