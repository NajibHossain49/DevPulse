import { Module } from "@nestjs/common";
import { UsageService } from "./usage.service";
import { UsageGuard } from "./usage.guard";
import { UsageController } from "./usage.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsageController],
  providers: [UsageService, UsageGuard],
  exports: [UsageService, UsageGuard],
})
export class UsageModule {}
