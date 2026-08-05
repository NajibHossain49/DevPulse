import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AiService } from "../ai/ai.service";
import { AlertsService } from "../alerts/alerts.service";

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string };
  };
};

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private token: string | null = null;
  private defaultChatId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly ai: AiService,
    private readonly alerts: AlertsService,
  ) {}

  onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) {
      this.logger.warn(
        "Telegram integration disabled (TELEGRAM_BOT_TOKEN not configured).",
      );
      return;
    }
    this.token = token;
    this.defaultChatId = process.env.TELEGRAM_CHAT_ID?.trim() || null;
    this.logger.log("Telegram bot configured");
  }

  isEnabled(): boolean {
    return Boolean(this.token);
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    const text = message?.text?.trim();
    const chatId = message?.chat?.id;
    if (!text || chatId == null) return;

    const [rawCmd, ...args] = text.split(/\s+/);
    const cmd = rawCmd.split("@")[0].toLowerCase(); // /standup@BotName

    switch (cmd) {
      case "/start":
      case "/help":
        await this.sendMessage(
          chatId,
          [
            "DevPulse bot commands:",
            "/standup <email> — AI standup for a user",
            "/stats <project> — 7-day project metrics",
            "/alert [project] — recent anomaly alerts",
            "/help — show this message",
          ].join("\n"),
        );
        break;

      case "/standup": {
        const email = args[0];
        if (!email) {
          await this.sendMessage(chatId, "Usage: /standup user@example.com");
          return;
        }
        const standup = await this.generateStandup(email);
        await this.sendMessage(chatId, `📝 Standup for ${email}\n\n${standup}`);
        break;
      }

      case "/stats": {
        const projectName = args.join(" ").trim();
        if (!projectName) {
          await this.sendMessage(chatId, "Usage: /stats <project name>");
          return;
        }
        const stats = await this.getProjectStats(projectName);
        await this.sendMessage(chatId, `📊 Stats for ${projectName}\n\n${stats}`);
        break;
      }

      case "/alert":
      case "/alerts": {
        const projectName = args.join(" ").trim();
        const alerts = await this.getRecentAlerts(projectName || undefined);
        if (alerts.length === 0) {
          await this.sendMessage(chatId, "✅ No recent anomalies detected.");
          return;
        }
        const body = alerts
          .slice(0, 8)
          .map((a) => `• ${a.title}: ${a.description}`)
          .join("\n");
        await this.sendMessage(chatId, `⚠️ Recent alerts\n\n${body}`);
        break;
      }

      default:
        // Ignore unrelated group chat noise
        if (cmd.startsWith("/")) {
          await this.sendMessage(
            chatId,
            "Unknown command. Try /help",
          );
        }
    }
  }

  async sendStandupReminder(teamId: string, chatId?: string) {
    const target = chatId || this.defaultChatId;
    if (!target) {
      this.logger.warn("No TELEGRAM_CHAT_ID for standup reminder");
      return;
    }

    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: true },
    });

    for (const member of members) {
      const standup = await this.generateStandup(member.user.email);
      await this.sendMessage(
        target,
        `📝 Daily Standup — ${member.user.name || member.user.email}\n\n${standup}`,
      );
    }
  }

  async sendAlert(
    alert: { title: string; description: string },
    chatId?: string,
  ) {
    const target = chatId || this.defaultChatId;
    if (!target) return;
    await this.sendMessage(
      target,
      `⚠️ DevPulse Alert: ${alert.title}\n${alert.description}`,
    );
  }

  async sendMessage(chatId: string | number, text: string): Promise<void> {
    if (!this.token) return;

    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Telegram sendMessage failed: ${res.status} ${body}`);
      }
    } catch (error) {
      this.logger.error(
        `Telegram sendMessage error: ${error instanceof Error ? error.message : String(error)}`,
      );
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

    return [
      `• PRs this week: ${metrics.totalPRs}`,
      `• Merge rate: ${metrics.mergeRate ?? "n/a"}%`,
      `• Avg review time: ${metrics.avgReviewTime ?? "n/a"} min`,
      `• Commits: ${metrics.commitsCount}`,
    ].join("\n");
  }

  private async getRecentAlerts(
    projectName?: string,
  ): Promise<{ title: string; description: string }[]> {
    if (projectName) {
      const project = await this.prisma.project.findFirst({
        where: { name: { contains: projectName, mode: "insensitive" } },
      });
      if (!project) return [];
      return this.alerts.detectAnomalies(project.id);
    }

    const projects = await this.prisma.project.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    const nested = await Promise.all(
      projects.map((p) => this.alerts.detectAnomalies(p.id)),
    );
    return nested.flat();
  }
}
