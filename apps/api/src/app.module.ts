import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { TeamsModule } from "./teams/teams.module";
import { ProjectsModule } from "./projects/projects.module";
import { GithubModule } from "./github/github.module";
import { RedisModule } from "./redis/redis.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AiModule } from "./ai/ai.module";
import { BillingModule } from "./billing/billing.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { UsageModule } from "./usage/usage.module";
import { WellnessModule } from "./wellness/wellness.module";
import { AlertsModule } from "./alerts/alerts.module";
import { EventsModule } from "./events/events.module";
import { TelegramModule } from "./telegram/telegram.module";
import { CommentsModule } from "./comments/comments.module";
import { BenchmarksModule } from "./benchmarks/benchmarks.module";
import { GoalsModule } from "./goals/goals.module";
import { ReportsModule } from "./reports/reports.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { GamificationModule } from "./gamification/gamification.module";
import { AuditModule } from "./audit/audit.module";
import { QueueModule } from "./queue/queue.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // 1 minute
          limit: 100, // 100 requests per minute
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    TeamsModule,
    ProjectsModule,
    GithubModule,
    IntegrationsModule,
    RedisModule,
    AnalyticsModule,
    AiModule,
    BillingModule,
    PermissionsModule,
    UsageModule,
    WellnessModule,
    AlertsModule,
    EventsModule,
    TelegramModule,
    CommentsModule,
    BenchmarksModule,
    GoalsModule,
    ReportsModule,
    GamificationModule,
    AuditModule,
    QueueModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
