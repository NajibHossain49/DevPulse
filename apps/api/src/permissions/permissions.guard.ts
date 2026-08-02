import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsService, Permission } from "./permissions.service";
import { PERMISSION_KEY } from "./permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<Permission | undefined>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    // No permission metadata on this handler -> nothing to enforce.
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException("Not authenticated");

    const teamId = await this.resolveTeamId(request);
    if (!teamId) throw new ForbiddenException("Team context required");

    const hasPermission = await this.permissionsService.hasPermission(
      user.id,
      teamId,
      requiredPermission,
    );
    if (!hasPermission) {
      throw new ForbiddenException(`Permission denied: ${requiredPermission}`);
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
      params.teamId ||
      (body.teamId as string | undefined) ||
      (query.teamId as string | undefined);
    if (direct) return direct;

    // Routes like teams/:id or projects/:id carry an entity id but no teamId.
    const entityId =
      params.id || (body.projectId as string | undefined) || (query.projectId as string | undefined);
    if (entityId) {
      return this.permissionsService.resolveTeamIdFromEntity(entityId);
    }
    return null;
  }
}
