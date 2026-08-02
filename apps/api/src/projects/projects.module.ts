import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { UsageModule } from "../usage/usage.module";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";

@Module({
  imports: [
    PrismaModule,
    IntegrationsModule,
    AuthModule,
    PermissionsModule,
    UsageModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
