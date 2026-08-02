import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { UsageModule } from "../usage/usage.module";
import { TeamsService } from "./teams.service";
import { TeamsController } from "./teams.controller";
import { MembersController } from "./members.controller";

@Module({
  imports: [PrismaModule, AuthModule, PermissionsModule, UsageModule],
  controllers: [TeamsController, MembersController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
