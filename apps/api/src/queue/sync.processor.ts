import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { Job } from "bullmq";
import { SyncService } from "../github/sync.service";
import { EventsGateway } from "../events/events.gateway";

@Processor("sync")
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<{ projectId: string }>) {
    const { projectId } = job.data;
    this.logger.log(`Processing sync job ${job.id} for project ${projectId}`);

    const syncService = this.moduleRef.get(SyncService, { strict: false });
    const result = await syncService.syncProject(projectId);

    this.eventsGateway.emitToProject(projectId, "sync_completed", {
      prsSynced: result.prsSynced,
      commitsSynced: result.commitsSynced,
      timestamp: new Date().toISOString(),
    });
    return result;
  }
}
