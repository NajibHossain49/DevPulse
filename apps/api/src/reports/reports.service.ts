import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService, ProjectMetrics } from "../analytics/analytics.service";
import * as cron from "node-cron";
import { Resend } from "resend";
import { getWebUrl } from "../common/web-url";

interface ReportEmailData {
  type: "weekly" | "monthly";
  teamName: string;
  projectName: string;
  metrics: ProjectMetrics;
}

@Injectable()
export class ReportsService implements OnModuleInit {
  private readonly logger = new Logger(ReportsService.name);
  private readonly resend: Resend | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {
    const key = process.env.RESEND_API_KEY;
    this.resend = key ? new Resend(key) : null;
  }

  onModuleInit() {
    this.scheduleReports();
  }

  private scheduleReports() {
    // Weekly reports every Monday at 9 AM.
    cron.schedule("0 9 * * 1", () => {
      this.logger.log("Generating weekly reports...");
      void this.sendWeeklyReports();
    });

    // Monthly reports on the 1st of each month at 9 AM.
    cron.schedule("0 9 1 * *", () => {
      this.logger.log("Generating monthly reports...");
      void this.sendMonthlyReports();
    });
  }

  async sendWeeklyReports() {
    const teams = await this.prisma.team.findMany({
      include: {
        members: { include: { user: true } },
        projects: true,
        subscription: true,
      },
    });

    const since = new Date();
    since.setDate(since.getDate() - 7);

    for (const team of teams) {
      // Scheduled email reports are a paid feature.
      if (!team.subscription || team.subscription.plan === "free") continue;

      for (const project of team.projects) {
        const metrics = await this.analytics.getProjectMetrics(
          project.id,
          since,
          new Date(),
        );

        for (const member of team.members) {
          await this.sendReportEmail(member.user.email, {
            type: "weekly",
            teamName: team.name,
            projectName: project.name,
            metrics,
          });
        }
      }
    }
  }

  async sendMonthlyReports() {
    this.logger.log("Monthly reports would be sent here");
  }

  private async sendReportEmail(to: string, data: ReportEmailData) {
    if (!this.resend) {
      this.logger.warn(
        `Skipping report to ${to} (RESEND_API_KEY not configured).`,
      );
      return;
    }
    try {
      await this.resend.emails.send({
        from: "DevPulse <reports@devpulse.io>",
        to,
        subject: `Weekly Report — ${data.teamName} / ${data.projectName}`,
        html: this.generateReportHtml(data),
      });
    } catch (err) {
      this.logger.error(`Failed to send report to ${to}`, err as Error);
    }
  }

  private generateReportHtml(data: ReportEmailData): string {
    const m = data.metrics;
    return `
      <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>${data.type === "weekly" ? "Weekly" : "Monthly"} Engineering Report</h1>
          <h2>${data.teamName} — ${data.projectName}</h2>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>PRs Merged:</strong> ${m.mergedPRs}</p>
            <p><strong>Avg Review Time:</strong> ${m.avgReviewTime ?? "n/a"} minutes</p>
            <p><strong>Merge Rate:</strong> ${m.mergeRate ?? "n/a"}%</p>
            <p><strong>Commits:</strong> ${m.commitsCount}</p>
          </div>
          <p>
            <a href="${getWebUrl()}/dashboard" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
          </p>
        </body>
      </html>
    `;
  }

  async sendProjectReport(
    projectId: string,
    to: string,
  ): Promise<{ sent: boolean }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { team: true },
    });
    if (!project) return { sent: false };

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const metrics = await this.analytics.getProjectMetrics(
      projectId,
      since,
      new Date(),
    );

    await this.sendReportEmail(to, {
      type: "weekly",
      teamName: project.team.name,
      projectName: project.name,
      metrics,
    });

    return { sent: this.resend !== null };
  }

  async generateReport(projectId: string, period: "7d" | "30d") {
    const days = period === "7d" ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const now = new Date();

    const [metrics, contributors] = await Promise.all([
      this.analytics.getProjectMetrics(projectId, since, now),
      this.analytics.getContributorStats(projectId, since, now),
    ]);

    return {
      period,
      generatedAt: now.toISOString(),
      metrics,
      contributors: contributors.slice(0, 5),
    };
  }
}
