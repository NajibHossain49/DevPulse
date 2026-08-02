import { forwardRef, Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AiModule } from "../ai/ai.module";
import { EventsModule } from "../events/events.module";
import { GitlabModule } from "../gitlab/gitlab.module";
import { GithubService } from "./github.service";
import { GithubAppService } from "./github-app.service";
import { SyncService } from "./sync.service";
import { SyncController } from "./sync.controller";
import { WebhookController } from "./webhook.controller";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EventsModule,
    GitlabModule,
    forwardRef(() => AiModule),
  ],
  controllers: [SyncController, WebhookController],
  providers: [GithubService, GithubAppService, SyncService],
  exports: [GithubService, SyncService],
})
export class GithubModule {}
