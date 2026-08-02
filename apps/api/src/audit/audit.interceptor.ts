import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import { AuditService } from "./audit.service";
import { AUDIT_ACTION_KEY, AUDIT_RESOURCE_KEY } from "./audit.decorator";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditAction = this.reflector.get<string | undefined>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );
    const auditResource = this.reflector.get<string | undefined>(
      AUDIT_RESOURCE_KEY,
      context.getHandler(),
    );

    if (!auditAction || !auditResource) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap({
        next: () => {
          void this.auditService.log({
            userId: request.user?.id,
            action: auditAction,
            resource: auditResource,
            resourceId:
              request.params?.id ||
              request.params?.teamId ||
              request.body?.id ||
              request.body?.teamId ||
              request.body?.projectId,
            metadata: {
              method: request.method,
              path: request.url,
              bodyKeys:
                request.body && typeof request.body === "object"
                  ? Object.keys(request.body)
                  : [],
            },
            ipAddress: request.ip,
            userAgent: request.headers?.["user-agent"],
          });
        },
      }),
    );
  }
}
