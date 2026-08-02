import { SetMetadata } from "@nestjs/common";

export const AUDIT_ACTION_KEY = "auditAction";
export const AUDIT_RESOURCE_KEY = "auditResource";

export const AuditAction = (action: string) =>
  SetMetadata(AUDIT_ACTION_KEY, action);
export const AuditResource = (resource: string) =>
  SetMetadata(AUDIT_RESOURCE_KEY, resource);
