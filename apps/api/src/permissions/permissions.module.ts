import { Module } from "@nestjs/common";
import { PermissionsGuard } from "./permissions.guard";
import { PermissionsService } from "./permissions.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [PermissionsGuard, PermissionsService],
  exports: [PermissionsGuard, PermissionsService],
})
export class PermissionsModule {}
