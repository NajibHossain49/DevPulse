import { Injectable, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class QueueService {
  constructor(
    @Optional() @InjectQueue("sync") private readonly syncQueue?: Queue,
    @Optional() @InjectQueue("ai-analysis") private readonly aiQueue?: Queue,
    @Optional() @InjectQueue("reports") private readonly reportsQueue?: Queue,
  ) {}

  get enabled() {
    return Boolean(this.syncQueue);
  }

  async addSyncJob(projectId: string) {
    if (!this.syncQueue) {
      return null;
    }
    const job = await this.syncQueue.add(
      "sync-project",
      { projectId },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    return { jobId: String(job.id), status: "queued" as const };
  }

  async addAIAnalysisJob(prId: string) {
    if (!this.aiQueue) {
      return { jobId: null, status: "disabled" as const };
    }
    const job = await this.aiQueue.add(
      "analyze-pr",
      { prId },
      {
        attempts: 2,
        backoff: { type: "fixed", delay: 10000 },
      },
    );
    return { jobId: String(job.id), status: "queued" as const };
  }

  async addReportJob(projectId: string, period: string) {
    if (!this.reportsQueue) {
      return { jobId: null, status: "disabled" as const };
    }
    const job = await this.reportsQueue.add(
      "generate-report",
      { projectId, period },
      { attempts: 2 },
    );
    return { jobId: String(job.id), status: "queued" as const };
  }

  async getQueueStatus() {
    if (!this.syncQueue || !this.aiQueue || !this.reportsQueue) {
      return {
        enabled: false,
        sync: { waiting: 0, active: 0 },
        aiAnalysis: { waiting: 0, active: 0 },
        reports: { waiting: 0, active: 0 },
      };
    }

    const [
      syncWaiting,
      syncActive,
      aiWaiting,
      aiActive,
      reportsWaiting,
      reportsActive,
    ] = await Promise.all([
      this.syncQueue.getWaitingCount(),
      this.syncQueue.getActiveCount(),
      this.aiQueue.getWaitingCount(),
      this.aiQueue.getActiveCount(),
      this.reportsQueue.getWaitingCount(),
      this.reportsQueue.getActiveCount(),
    ]);

    return {
      enabled: true,
      sync: { waiting: syncWaiting, active: syncActive },
      aiAnalysis: { waiting: aiWaiting, active: aiActive },
      reports: { waiting: reportsWaiting, active: reportsActive },
    };
  }
}
