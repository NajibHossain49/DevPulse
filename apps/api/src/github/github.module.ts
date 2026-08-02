import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { GithubService } from "./github.service";
import { SyncService } from "./sync.service";
import { SyncController } from "./sync.controller";
import { WebhookController } from "./webhook.controller";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SyncController, WebhookController],
  providers: [GithubService, SyncService],
  exports: [GithubService, SyncService],
})
export class GithubModule {}
