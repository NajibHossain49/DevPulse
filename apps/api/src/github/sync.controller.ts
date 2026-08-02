import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
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
import { PrismaService } from "../prisma/prisma.service";
import { SyncService } from "./sync.service";
import { SyncProjectDto } from "./dto/sync-project.dto";
import { EventsGateway } from "../events/events.gateway";

@ApiTags("github")
@ApiBearerAuth()
@Controller("github")
@UseGuards(AuthGuard)
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Post("sync")
  @ApiOperation({ summary: "Sync a project's PRs and commits from GitHub" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async syncProject(
    @CurrentUser("id") userId: string,
    @Body() dto: SyncProjectDto,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      include: { team: { include: { members: true } } },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const team = project.team;
    const hasAccess =
      team.ownerId === userId ||
      team.members.some((m) => m.userId === userId);

    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this project");
    }

    const result = await this.syncService.syncProject(dto.projectId);

    this.eventsGateway.emitToProject(dto.projectId, "sync_completed", {
      prsSynced: result.prsSynced,
      commitsSynced: result.commitsSynced,
      timestamp: new Date().toISOString(),
    });

    return result;
  }
}
