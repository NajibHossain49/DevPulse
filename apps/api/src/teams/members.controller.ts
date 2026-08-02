import {
  Body,
  Controller,
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
import { AddMemberDto } from "./dto/add-member.dto";

@ApiTags("members")
@ApiBearerAuth()
@Controller("teams/:teamId/members")
@UseGuards(AuthGuard)
export class MembersController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: "Add a member to a team by email" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  addMember(
    @CurrentUser("id") userId: string,
    @Param("teamId") teamId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.teamsService.addMember(userId, teamId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List members of a team" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getMembers(
    @CurrentUser("id") userId: string,
    @Param("teamId") teamId: string,
  ) {
    return this.teamsService.getMembers(userId, teamId);
  }
}
