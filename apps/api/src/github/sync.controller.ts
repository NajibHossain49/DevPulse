import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { SyncService } from "./sync.service";
import { SyncProjectDto } from "./dto/sync-project.dto";

@Controller("github")
@UseGuards(AuthGuard)
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("sync")
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

    return this.syncService.syncProject(dto.projectId);
  }
}
