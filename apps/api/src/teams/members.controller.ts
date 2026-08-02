import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { TeamsService } from "./teams.service";
import { AddMemberDto } from "./dto/add-member.dto";

@Controller("teams/:teamId/members")
@UseGuards(AuthGuard)
export class MembersController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  addMember(
    @CurrentUser("id") userId: string,
    @Param("teamId") teamId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.teamsService.addMember(userId, teamId, dto);
  }

  @Get()
  getMembers(
    @CurrentUser("id") userId: string,
    @Param("teamId") teamId: string,
  ) {
    return this.teamsService.getMembers(userId, teamId);
  }
}
