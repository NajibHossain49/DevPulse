import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { AddMemberDto } from "./dto/add-member.dto";

const MEMBER_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTeam(userId: string, dto: CreateTeamDto) {
    const slug = await this.generateUniqueSlug(dto.name);

    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        slug,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "admin",
          },
        },
      },
      include: {
        _count: { select: { members: true, projects: true } },
      },
    });

    return this.withCounts(team);
  }

  async getMyTeams(userId: string) {
    const teams = await this.prisma.team.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        _count: { select: { members: true, projects: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return teams.map((team) => this.withCounts(team));
  }

  async getTeam(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: { select: MEMBER_USER_SELECT } },
          orderBy: { createdAt: "asc" },
        },
        projects: {
          select: { id: true, name: true, githubRepo: true },
        },
        _count: { select: { members: true, projects: true } },
      },
    });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    this.assertAccess(team, userId);

    return this.withCounts(team);
  }

  async deleteTeam(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    if (team.ownerId !== userId) {
      throw new ForbiddenException("Only the team owner can delete the team");
    }

    await this.prisma.team.delete({ where: { id: teamId } });

    return { success: true };
  }

  async addMember(requesterId: string, teamId: string, dto: AddMemberDto) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    this.assertAdmin(team, requesterId);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException(`No user found with email ${dto.email}`);
    }

    const alreadyMember = team.members.some((m) => m.userId === user.id);
    if (alreadyMember) {
      throw new ConflictException("User is already a member of this team");
    }

    const member = await this.prisma.teamMember.create({
      data: {
        teamId,
        userId: user.id,
        role: "member",
      },
      include: { user: { select: MEMBER_USER_SELECT } },
    });

    return member;
  }

  async getMembers(requesterId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    this.assertAccess(team, requesterId);

    return this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: { select: MEMBER_USER_SELECT } },
      orderBy: { createdAt: "asc" },
    });
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || "team";
    const existing = await this.prisma.team.findUnique({
      where: { slug: base },
    });

    if (!existing) return base;

    // Append random characters until we find an unused slug.
    let slug = `${base}-${randomChars(4)}`;
    while (await this.prisma.team.findUnique({ where: { slug } })) {
      slug = `${base}-${randomChars(4)}`;
    }
    return slug;
  }

  private assertAccess(
    team: { ownerId: string; members: { userId: string }[] },
    userId: string,
  ) {
    const hasAccess =
      team.ownerId === userId ||
      team.members.some((m) => m.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this team");
    }
  }

  private assertAdmin(
    team: {
      ownerId: string;
      members: { userId: string; role: string }[];
    },
    userId: string,
  ) {
    const isAdmin =
      team.ownerId === userId ||
      team.members.some((m) => m.userId === userId && m.role === "admin");
    if (!isAdmin) {
      throw new ForbiddenException(
        "Only team admins can perform this action",
      );
    }
  }

  private withCounts<T extends { _count: { members: number; projects: number } }>(
    team: T,
  ) {
    const { _count, ...rest } = team;
    return {
      ...rest,
      memberCount: _count.members,
      projectCount: _count.projects,
    };
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function randomChars(length: number): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length)
    .padEnd(length, "0");
}
