import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UsageService, UsageType } from "./usage.service";
import { USAGE_LIMIT_KEY } from "./usage.decorator";

@Injectable()
export class UsageGuard implements CanActivate {
  constructor(
    private readonly usageService: UsageService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitType = this.reflector.get<UsageType | undefined>(
      USAGE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!limitType) return true;

    const request = context.switchToHttp().getRequest();
    const teamId = await this.resolveTeamId(request);
    // If we cannot determine a team, do not block the request.
    if (!teamId) return true;

    const allowed = await this.usageService.checkLimit(teamId, limitType);
    if (!allowed) {
      throw new ForbiddenException(
        `Usage limit exceeded for ${limitType}. Please upgrade your plan.`,
      );
    }
    return true;
  }

  private async resolveTeamId(request: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
  }): Promise<string | null> {
    const params = request.params ?? {};
    const body = request.body ?? {};
    const query = request.query ?? {};

    const direct =
      (body.teamId as string | undefined) ||
      (query.teamId as string | undefined) ||
      params.teamId;
    if (direct) return direct;

    const projectId =
      (body.projectId as string | undefined) ||
      (query.projectId as string | undefined) ||
      params.id;
    if (projectId) {
      return this.usageService.getTeamIdForProject(projectId);
    }
    return null;
  }
}
