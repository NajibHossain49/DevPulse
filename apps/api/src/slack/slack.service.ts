import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { App } from "@slack/bolt";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AiService } from "../ai/ai.service";

@Injectable()
export class SlackService implements OnModuleInit {
  private app: App | null = null;
  private readonly logger = new Logger(SlackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly ai: AiService,
  ) {}

  onModuleInit() {
    const token = process.env.SLACK_BOT_TOKEN;
    const signingSecret = process.env.SLACK_SIGNING_SECRET;

    // Only boot the Slack app when real credentials are configured. Bolt's
    // constructor throws without a signing secret, so guarding here prevents
    // it from taking down the whole API when Slack is not set up.
    if (!token || !signingSecret || token.startsWith("xoxb-your")) {
      this.logger.warn(
        "Slack integration disabled (SLACK_BOT_TOKEN / SLACK_SIGNING_SECRET not configured).",
      );
      return;
    }

    this.app = new App({ token, signingSecret });
    this.registerCommands();
    void this.startApp();
  }

  private registerCommands() {
    if (!this.app) return;

    // /devpulse standup|stats|alert
    this.app.command("/devpulse", async ({ command, ack, say }) => {
      await ack();

      const [subcommand, ...args] = command.text.split(" ");

      switch (subcommand) {
        case "standup": {
          const userEmail = args[0]
            ?.replace("<mailto:", "")
            .replace(">", "")
            .split("|")[0];
          if (!userEmail) {
            await say("Usage: `/devpulse standup @user`");
            return;
          }
          const standup = await this.generateStandup(userEmail);
          await say(`:memo: *Standup for ${userEmail}:*\n${standup}`);
          break;
        }

        case "stats": {
          const projectName = args.join(" ");
          const stats = await this.getProjectStats(projectName);
          await say(`:bar_chart: *Stats for ${projectName}:*\n${stats}`);
          break;
        }

        case "alert": {
          const alerts = await this.getRecentAlerts();
          if (alerts.length === 0) {
            await say(":white_check_mark: No recent anomalies detected.");
          } else {
            const alertText = alerts
              .map((a) => `• *${a.title}*: ${a.description}`)
              .join("\n");
            await say(`:warning: *Recent Alerts:*\n${alertText}`);
          }
          break;
        }

        default:
          await say("Available commands: `standup`, `stats`, `alert`");
      }
    });
  }

  private async startApp() {
    if (!this.app) return;
    try {
      const port = Number(process.env.SLACK_PORT) || 3002;
      await this.app.start(port);
      this.logger.log(`Slack app started on port ${port}`);
    } catch (err) {
      this.logger.error("Failed to start Slack app", err as Error);
    }
  }

  private async generateStandup(userEmail: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { email: userEmail },
    });
    if (!user) return "User not found";

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const author = user.name || userEmail;
    const commits = await this.prisma.commit.findMany({
      where: { author, createdAt: { gte: since } },
    });
    const prs = await this.prisma.pullRequest.findMany({
      where: { author, createdAt: { gte: since } },
    });

    return this.ai.generateStandup(commits, prs, user.name || "Developer");
  }

  private async getProjectStats(projectName: string): Promise<string> {
    const project = await this.prisma.project.findFirst({
      where: { name: { contains: projectName, mode: "insensitive" } },
    });
    if (!project) return "Project not found";

    const metrics = await this.analytics.getProjectMetrics(
      project.id,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date(),
    );

    return `• PRs this week: ${metrics.totalPRs}\n• Merge rate: ${metrics.mergeRate ?? "n/a"}%\n• Avg review time: ${metrics.avgReviewTime ?? "n/a"}min\n• Commits: ${metrics.commitsCount}`;
  }

  private async getRecentAlerts(): Promise<
    { title: string; description: string }[]
  > {
    return [];
  }

  // Public helper to push a daily standup digest into a Slack channel.
  async sendStandupReminder(channelId: string, teamId: string) {
    if (!this.app) return;

    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: true },
    });

    for (const member of members) {
      const standup = await this.generateStandup(member.user.email);
      await this.app.client.chat.postMessage({
        channel: channelId,
        text: `:memo: *Daily Standup — ${member.user.name}*\n${standup}`,
      });
    }
  }

  async sendAlert(
    channelId: string,
    alert: { title: string; description: string },
  ) {
    if (!this.app) return;
    await this.app.client.chat.postMessage({
      channel: channelId,
      text: `:warning: *DevPulse Alert: ${alert.title}*\n${alert.description}`,
    });
  }
}
