import { Body, Controller, Headers, Post, Res } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import type { Response } from "express";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { SyncService } from "./sync.service";
import { GithubAppService } from "./github-app.service";
import { EventsGateway } from "../events/events.gateway";

@ApiTags("github")
@Controller("github/webhook")
export class WebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: SyncService,
    private readonly githubAppService: GithubAppService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Post()
  @ApiOperation({ summary: "GitHub webhook receiver (HMAC-signed)" })
  @ApiResponse({ status: 200, description: "Success" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  handle(
    @Headers("x-github-event") event: string,
    @Headers("x-hub-signature-256") signature: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    if (!this.verifySignature(body, signature)) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid signature" });
    }

    // Acknowledge immediately; process the payload without blocking the response.
    res.status(200).json({ success: true });
    void this.process(event, body);
  }

  private verifySignature(body: any, signature: string): boolean {
    if (!signature) return false;

    const secret = process.env.WEBHOOK_SECRET || "";
    const expected =
      "sha256=" +
      crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(body))
        .digest("hex");

    const provided = Buffer.from(signature);
    const computed = Buffer.from(expected);
    if (provided.length !== computed.length) return false;

    return crypto.timingSafeEqual(provided, computed);
  }

  private async process(event: string, body: any): Promise<void> {
    try {
      const fullName = body?.repository?.full_name;
      if (!fullName) return;

      const project = await this.prisma.project.findFirst({
        where: { githubRepo: fullName },
      });
      if (!project) return;

      switch (event) {
        case "pull_request":
          await this.handlePullRequest(project, body);
          break;
        case "pull_request_review":
          await this.handlePullRequestReview(body);
          break;
        case "push":
          await this.syncService.syncProject(project.id);
          break;
        default:
          break;
      }

      // Broadcast a real-time event to connected clients.
      if (event === "pull_request" || event === "push") {
        this.eventsGateway.emitToProject(project.id, "activity", {
          type: event,
          action: body?.action,
          projectId: project.id,
          data: {
            prTitle: body?.pull_request?.title,
            author: body?.pull_request?.user?.login ?? body?.sender?.login,
            timestamp: new Date().toISOString(),
          },
        });
        this.eventsGateway.emitToTeam(project.teamId, "notification", {
          type: "pr_update",
          message:
            event === "pull_request"
              ? `PR "${body?.pull_request?.title ?? ""}" was ${body?.action ?? "updated"}`
              : "New commits were pushed",
          projectId: project.id,
        });
      }
    } catch {
      // Swallow errors: the webhook was already acknowledged with 200.
    }
  }

  private async handlePullRequest(
    project: { id: string; autoReview: boolean },
    body: any,
  ): Promise<void> {
    const pr = body?.pull_request;
    if (!pr) return;

    const createdAt = new Date(pr.created_at);
    const data = {
      number: pr.number,
      title: pr.title ?? "",
      body: pr.body ?? null,
      state: pr.merged_at ? "merged" : pr.state,
      author: pr.user?.login ?? "unknown",
      authorAvatar: pr.user?.avatar_url ?? null,
      projectId: project.id,
      createdAt,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      additions: pr.additions ?? 0,
      deletions: pr.deletions ?? 0,
      changedFiles: pr.changed_files ?? 0,
    };

    // Upsert first so the auto-review DB update below can find the row.
    await this.prisma.pullRequest.upsert({
      where: { githubId: BigInt(pr.id) },
      create: { githubId: BigInt(pr.id), ...data },
      update: data,
    });

    // Automated AI review when a PR is freshly opened (if enabled).
    if (body?.action === "opened" && project.autoReview) {
      await this.githubAppService.handlePullRequestOpened(body);
    }
  }

  private async handlePullRequestReview(body: any): Promise<void> {
    const pr = body?.pull_request;
    const review = body?.review;
    if (!pr || !review) return;

    const existing = await this.prisma.pullRequest.findUnique({
      where: { githubId: BigInt(pr.id) },
    });
    if (!existing || existing.firstReviewAt) return;

    const submittedAt = review.submitted_at
      ? new Date(review.submitted_at)
      : new Date();
    const reviewTime = Math.round(
      (submittedAt.getTime() - existing.createdAt.getTime()) / 60000,
    );

    await this.prisma.pullRequest.update({
      where: { githubId: BigInt(pr.id) },
      data: { firstReviewAt: submittedAt, reviewTime },
    });
  }
}
