import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type AlertType =
  | "review_time_spike"
  | "activity_drop"
  | "pr_size_spike"
  | "merge_rate_drop"
  | "quality_drop";

export type AlertSeverity = "low" | "medium" | "high";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  projectId: string;
  createdAt: Date;
  read: boolean;
}

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async detectAnomalies(projectId: string): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentPRs = await this.prisma.pullRequest.findMany({
      where: {
        projectId,
        createdAt: { gte: lastWeek },
        reviewTime: { not: null },
      },
    });
    const previousPRs = await this.prisma.pullRequest.findMany({
      where: {
        projectId,
        createdAt: { gte: twoWeeksAgo, lt: lastWeek },
        reviewTime: { not: null },
      },
    });

    // 1. Review time spike
    const recentAvg = this.avg(recentPRs.map((p) => p.reviewTime ?? 0));
    const previousAvg = this.avg(previousPRs.map((p) => p.reviewTime ?? 0));

    if (previousAvg > 0 && recentAvg > previousAvg * 2) {
      alerts.push({
        id: `rt-${projectId}-${Date.now()}`,
        type: "review_time_spike",
        severity: "high",
        title: "Review time doubled",
        description: `Average review time increased from ${Math.round(previousAvg)}min to ${Math.round(recentAvg)}min`,
        projectId,
        createdAt: now,
        read: false,
      });
    }

    // 2. Activity drop
    const recentCommits = await this.prisma.commit.count({
      where: { projectId, createdAt: { gte: lastWeek } },
    });
    const previousCommits = await this.prisma.commit.count({
      where: { projectId, createdAt: { gte: twoWeeksAgo, lt: lastWeek } },
    });

    if (previousCommits > 10 && recentCommits < previousCommits * 0.5) {
      alerts.push({
        id: `ad-${projectId}-${Date.now()}`,
        type: "activity_drop",
        severity: "medium",
        title: "Activity dropped significantly",
        description: `Commits decreased from ${previousCommits} to ${recentCommits} this week`,
        projectId,
        createdAt: now,
        read: false,
      });
    }

    // 3. Merge rate drop
    const recentTotal = recentPRs.length;
    const recentMerged = recentPRs.filter((p) => p.state === "merged").length;
    const previousTotal = previousPRs.length;
    const previousMerged = previousPRs.filter(
      (p) => p.state === "merged",
    ).length;

    const recentMergeRate = recentTotal > 0 ? recentMerged / recentTotal : 0;
    const previousMergeRate =
      previousTotal > 0 ? previousMerged / previousTotal : 0;

    if (previousMergeRate > 0.5 && recentMergeRate < previousMergeRate * 0.7) {
      alerts.push({
        id: `mr-${projectId}-${Date.now()}`,
        type: "merge_rate_drop",
        severity: "medium",
        title: "Merge rate declining",
        description: `Merge rate dropped from ${Math.round(previousMergeRate * 100)}% to ${Math.round(recentMergeRate * 100)}%`,
        projectId,
        createdAt: now,
        read: false,
      });
    }

    // 4. Quality drop
    const recentQuality = await this.prisma.pullRequest.findMany({
      where: {
        projectId,
        createdAt: { gte: lastWeek },
        aiQualityScore: { not: null },
      },
    });
    const previousQuality = await this.prisma.pullRequest.findMany({
      where: {
        projectId,
        createdAt: { gte: twoWeeksAgo, lt: lastWeek },
        aiQualityScore: { not: null },
      },
    });

    const recentAvgQuality = this.avg(
      recentQuality.map((p) => p.aiQualityScore ?? 0),
    );
    const previousAvgQuality = this.avg(
      previousQuality.map((p) => p.aiQualityScore ?? 0),
    );

    if (previousAvgQuality > 0 && recentAvgQuality < previousAvgQuality * 0.8) {
      alerts.push({
        id: `qd-${projectId}-${Date.now()}`,
        type: "quality_drop",
        severity: "high",
        title: "Code quality declining",
        description: `Average AI quality score dropped from ${Math.round(previousAvgQuality)} to ${Math.round(recentAvgQuality)}`,
        projectId,
        createdAt: now,
        read: false,
      });
    }

    return alerts;
  }

  async getAlerts(userId: string, projectId?: string): Promise<Alert[]> {
    // Alerts are computed on-demand (not persisted).
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const ownedTeams = await this.prisma.team.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const teamIds = Array.from(
      new Set([
        ...memberships.map((t) => t.teamId),
        ...ownedTeams.map((t) => t.id),
      ]),
    );

    const projects = await this.prisma.project.findMany({
      where: { teamId: { in: teamIds } },
    });

    let allAlerts: Alert[] = [];
    for (const project of projects) {
      if (!projectId || project.id === projectId) {
        const alerts = await this.detectAnomalies(project.id);
        allAlerts = allAlerts.concat(alerts);
      }
    }

    return allAlerts.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  private avg(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
