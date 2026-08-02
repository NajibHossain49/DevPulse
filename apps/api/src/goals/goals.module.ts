import { Module } from "@nestjs/common";
import { GoalsService } from "./goals.service";
import { GoalsController } from "./goals.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [GoalsService],
  controllers: [GoalsController],
})
export class GoalsModule {}
