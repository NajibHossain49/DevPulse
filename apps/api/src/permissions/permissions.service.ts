import { ForbiddenException, Injectable } from "@nestjs/common";
import { TeamRole } from "@devpulse/database";
import { PrismaService } from "../prisma/prisma.service";

export enum Permission {
  TEAM_READ = "team:read",
  TEAM_WRITE = "team:write",
  TEAM_ADMIN = "team:admin",
  PROJECT_READ = "project:read",
  PROJECT_WRITE = "project:write",
  PROJECT_DELETE = "project:delete",
  MEMBER_INVITE = "member:invite",
  MEMBER_REMOVE = "member:remove",
  BILLING_READ = "billing:read",
  BILLING_WRITE = "billing:write",
  ANALYTICS_READ = "analytics:read",
  SETTINGS_READ = "settings:read",
  SETTINGS_WRITE = "settings:write",
}

const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  owner: Object.values(Permission),
  admin: [
    Permission.TEAM_READ,
    Permission.TEAM_WRITE,
    Permission.PROJECT_READ,
    Permission.PROJECT_WRITE,
    Permission.PROJECT_DELETE,
    Permission.MEMBER_INVITE,
    Permission.MEMBER_REMOVE,
    Permission.BILLING_READ,
    Permission.ANALYTICS_READ,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_WRITE,
  ],
  member: [
    Permission.TEAM_READ,
    Permission.PROJECT_READ,
    Permission.PROJECT_WRITE,
    Permission.ANALYTICS_READ,
    Permission.SETTINGS_READ,
  ],
  viewer: [
    Permission.TEAM_READ,
    Permission.PROJECT_READ,
    Permission.ANALYTICS_READ,
  ],
};

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserRole(
    userId: string,
    teamId: string,
  ): Promise<TeamRole | null> {
    // The team owner always resolves to the `owner` role, regardless of any
    // stored TeamMember role, so ownership can never be accidentally downgraded.
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) return null;
    if (team.ownerId === userId) return TeamRole.owner;

    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    return member?.role ?? null;
  }

  async hasPermission(
    userId: string,
    teamId: string,
    permission: Permission,
  ): Promise<boolean> {
    const role = await this.getUserRole(userId, teamId);
    if (!role) return false;
    return ROLE_PERMISSIONS[role].includes(permission);
  }

  async requirePermission(
    userId: string,
    teamId: string,
    permission: Permission,
  ) {
    const has = await this.hasPermission(userId, teamId, permission);
    if (!has) {
      throw new ForbiddenException(`You do not have permission: ${permission}`);
    }
  }

  /**
   * Resolve a teamId from an ambiguous route id that may be either a team id
   * (e.g. teams/:id) or a project id (e.g. projects/:id).
   */
  async resolveTeamIdFromEntity(id: string): Promise<string | null> {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (team) return team.id;
    const project = await this.prisma.project.findUnique({ where: { id } });
    return project?.teamId ?? null;
  }
}
