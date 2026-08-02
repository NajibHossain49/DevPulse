import { SetMetadata } from "@nestjs/common";
import { Permission } from "./permissions.service";

export const PERMISSION_KEY = "permission";

export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);
