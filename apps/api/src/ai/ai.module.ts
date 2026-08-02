import { forwardRef, Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { GithubModule } from "../github/github.module";
import { RedisModule } from "../redis/redis.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AuthModule } from "../auth/auth.module";
import { UsageModule } from "../usage/usage.module";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => GithubModule),
    RedisModule,
    AnalyticsModule,
    AuthModule,
    UsageModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
