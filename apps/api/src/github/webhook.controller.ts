import { Body, Controller, Headers, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { SyncService } from "./sync.service";

@Controller("github/webhook")
export class WebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: SyncService,
  ) {}

  @Post()
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
          await this.handlePullRequest(project.id, body);
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
    } catch {
      // Swallow errors: the webhook was already acknowledged with 200.
    }
  }

  private async handlePullRequest(
    projectId: string,
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
      projectId,
      createdAt,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      additions: pr.additions ?? 0,
      deletions: pr.deletions ?? 0,
      changedFiles: pr.changed_files ?? 0,
    };

    await this.prisma.pullRequest.upsert({
      where: { githubId: pr.id },
      create: { githubId: pr.id, ...data },
      update: data,
    });
  }

  private async handlePullRequestReview(body: any): Promise<void> {
    const pr = body?.pull_request;
    const review = body?.review;
    if (!pr || !review) return;

    const existing = await this.prisma.pullRequest.findUnique({
      where: { githubId: pr.id },
    });
    if (!existing || existing.firstReviewAt) return;

    const submittedAt = review.submitted_at
      ? new Date(review.submitted_at)
      : new Date();
    const reviewTime = Math.round(
      (submittedAt.getTime() - existing.createdAt.getTime()) / 60000,
    );

    await this.prisma.pullRequest.update({
      where: { githubId: pr.id },
      data: { firstReviewAt: submittedAt, reviewTime },
    });
  }
}
