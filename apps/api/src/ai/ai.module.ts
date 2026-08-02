import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { GithubModule } from "../github/github.module";
import { RedisModule } from "../redis/redis.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AuthModule } from "../auth/auth.module";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";

@Module({
  imports: [
    PrismaModule,
    GithubModule,
    RedisModule,
    AnalyticsModule,
    AuthModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
