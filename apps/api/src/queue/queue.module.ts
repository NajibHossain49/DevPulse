import { DynamicModule, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueueService } from "./queue.service";
import { QueueController } from "./queue.controller";
import { SyncProcessor } from "./sync.processor";
import { EventsModule } from "../events/events.module";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";

function redisUrl(): string | null {
  return process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || null;
}

@Module({})
export class QueueModule {
  static forRoot(): DynamicModule {
    const url = redisUrl();

    // Without a Redis TCP URL, expose a no-op QueueService so the API still boots.
    // Upstash REST (`UPSTASH_REDIS_REST_URL`) is NOT compatible with BullMQ.
    if (!url) {
      return {
        global: true,
        module: QueueModule,
        imports: [PrismaModule, AuthModule],
        controllers: [QueueController],
        providers: [QueueService],
        exports: [QueueService],
      };
    }

    return {
      global: true,
      module: QueueModule,
      imports: [
        PrismaModule,
        AuthModule,
        EventsModule,
        BullModule.forRoot({
          connection: { url },
        }),
        BullModule.registerQueue(
          { name: "sync" },
          { name: "ai-analysis" },
          { name: "reports" },
        ),
      ],
      controllers: [QueueController],
      providers: [QueueService, SyncProcessor],
      exports: [QueueService],
    };
  }
}
