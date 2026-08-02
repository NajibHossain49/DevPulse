import { Module } from "@nestjs/common";
import { SlackService } from "./slack.service";
import { SlackController } from "./slack.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [PrismaModule, AnalyticsModule, AiModule],
  providers: [SlackService],
  controllers: [SlackController],
  exports: [SlackService],
})
export class SlackModule {}
