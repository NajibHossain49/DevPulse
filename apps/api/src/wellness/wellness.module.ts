import { Module } from "@nestjs/common";
import { WellnessService } from "./wellness.service";
import { WellnessController } from "./wellness.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [WellnessService],
  controllers: [WellnessController],
  exports: [WellnessService],
})
export class WellnessModule {}
