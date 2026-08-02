import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GithubService } from "../github/github.service";
import { CreateProjectDto } from "./dto/create-project.dto";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubService,
  ) {}

  async createProject(userId: string, dto: CreateProjectDto) {
    await this.assertTeamAccess(userId, dto.teamId);

    const repoExists = await this.github.validateRepo(dto.githubRepo);
    if (!repoExists) {
      throw new BadRequestException(
        `GitHub repository "${dto.githubRepo}" was not found or is not accessible`,
      );
    }

    return this.prisma.project.create({
      data: {
        name: dto.name,
        githubRepo: dto.githubRepo,
        teamId: dto.teamId,
      },
    });
  }

  async getProjects(userId: string, teamId: string) {
    await this.assertTeamAccess(userId, teamId);

    const projects = await this.prisma.project.findMany({
      where: { teamId },
      include: { _count: { select: { pullRequests: true } } },
      orderBy: { createdAt: "desc" },
    });

    return projects.map((project) => this.withPrCount(project));
  }

  async getProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: { include: { members: true } },
        _count: { select: { pullRequests: true } },
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const { team } = project;
    const hasAccess =
      team.ownerId === userId ||
      team.members.some((m) => m.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this project");
    }

    const { _count, team: _team, ...rest } = project;
    return {
      ...rest,
      prCount: _count.pullRequests,
      lastSyncedAt: project.lastSyncedAt,
    };
  }

  async updateSettings(
    userId: string,
    projectId: string,
    settings: { autoReview: boolean },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { team: { include: { members: true } } },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const { team } = project;
    const hasAccess =
      team.ownerId === userId ||
      team.members.some((m) => m.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this project");
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { autoReview: settings.autoReview },
    });
  }

  async deleteProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { team: { include: { members: true } } },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const { team } = project;
    const isAdmin =
      team.ownerId === userId ||
      team.members.some((m) => m.userId === userId && m.role === "admin");
    if (!isAdmin) {
      throw new ForbiddenException(
        "Only team admins can delete a project",
      );
    }

    await this.prisma.project.delete({ where: { id: projectId } });
    return { success: true };
  }

  private async assertTeamAccess(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const hasAccess =
      team.ownerId === userId ||
      team.members.some((m) => m.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this team");
    }

    return team;
  }

  private withPrCount<T extends { _count: { pullRequests: number } }>(
    project: T,
  ) {
    const { _count, ...rest } = project;
    return { ...rest, prCount: _count.pullRequests };
  }
}
