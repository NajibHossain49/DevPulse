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
import { PermissionsGuard } from "../permissions/permissions.guard";
import { RequirePermission } from "../permissions/permissions.decorator";
import { Permission } from "../permissions/permissions.service";
import { UsageGuard } from "../usage/usage.guard";
import { UsageLimit } from "../usage/usage.decorator";
import { UsageService } from "../usage/usage.service";

@ApiTags("members")
@ApiBearerAuth()
@Controller("teams/:teamId/members")
@UseGuards(AuthGuard, PermissionsGuard, UsageGuard)
export class MembersController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly usageService: UsageService,
  ) {}

  @Post()
  @RequirePermission(Permission.MEMBER_INVITE)
  @UsageLimit("team_member")
  @ApiOperation({ summary: "Add a member to a team by email" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden / limit exceeded" })
  async addMember(
    @CurrentUser("id") userId: string,
    @Param("teamId") teamId: string,
    @Body() dto: AddMemberDto,
  ) {
    const member = await this.teamsService.addMember(userId, teamId, dto);
    await this.usageService.incrementUsage(teamId, "team_member");
    return member;
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
