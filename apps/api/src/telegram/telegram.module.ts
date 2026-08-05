import { Module } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { TelegramController } from "./telegram.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AiModule } from "../ai/ai.module";
import { AlertsModule } from "../alerts/alerts.module";

@Module({
  imports: [PrismaModule, AnalyticsModule, AiModule, AlertsModule],
  providers: [TelegramService],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}
