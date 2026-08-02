import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface WellnessMetrics {
  commitsPerWeek: number;
  weekendCommits: number;
  lateNightCommits: number; // after 10 PM or before 6 AM
  consecutiveDays: number;
  avgCommitsPerDay: number;
  daysSinceLastCommit: number;
}

export type WellnessRisk = "low" | "medium" | "high";

export interface WellnessResult {
  score: number;
  risk: WellnessRisk;
  metrics: WellnessMetrics;
  insights: string[];
  suggestions: string[];
}

@Injectable()
export class WellnessService {
  constructor(private readonly prisma: PrismaService) {}

  async getWellnessScore(
    userId: string,
    projectId?: string,
    weeks = 4,
  ): Promise<WellnessResult> {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    // Commits store the GitHub login as `author`, but we identify users by
    // their DB id. Best-effort match on the user's name / email local-part.
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const candidates = [user?.name, user?.email?.split("@")[0]]
      .filter((v): v is string => !!v)
      .map((v) => v.toLowerCase());

    const commits = candidates.length
      ? (
          await this.prisma.commit.findMany({
            where: {
              createdAt: { gte: since },
              ...(projectId ? { projectId } : {}),
            },
          })
        ).filter((c) => candidates.includes((c.author ?? "").toLowerCase()))
      : [];

    const metrics = this.calculateMetrics(commits, weeks);
    const score = this.calculateWellnessScore(metrics);
    const risk: WellnessRisk =
      score >= 70 ? "low" : score >= 40 ? "medium" : "high";
    const { insights, suggestions } = this.generateInsights(metrics);

    return { score, risk, metrics, insights, suggestions };
  }

  async getTeamWellness(teamId: string, weeks = 4) {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: true },
    });

    const scores = await Promise.all(
      members.map(async (m) => {
        const wellness = await this.getWellnessScore(
          m.userId,
          undefined,
          weeks,
        );
        return {
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
          ...wellness,
        };
      }),
    );

    const teamAverage =
      scores.length > 0
        ? Math.round(
            scores.reduce((sum, s) => sum + s.score, 0) / scores.length,
          )
        : 0;

    return {
      teamAverage,
      members: scores.sort((a, b) => a.score - b.score), // lowest (highest risk) first
    };
  }

  private calculateMetrics(
    commits: { createdAt: Date }[],
    weeks: number,
  ): WellnessMetrics {
    const commitsByDay = new Map<string, number>();
    let weekendCommits = 0;
    let lateNightCommits = 0;

    for (const commit of commits) {
      const date = new Date(commit.createdAt);
      const dayKey = date.toISOString().split("T")[0];
      commitsByDay.set(dayKey, (commitsByDay.get(dayKey) || 0) + 1);

      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) weekendCommits++;
      if (hour >= 22 || hour <= 5) lateNightCommits++;
    }

    const sortedDays = Array.from(commitsByDay.keys()).sort();
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    let lastDate: Date | null = null;

    for (const day of sortedDays) {
      const currentDate = new Date(day);
      if (lastDate) {
        const diff =
          (currentDate.getTime() - lastDate.getTime()) /
          (1000 * 60 * 60 * 24);
        if (diff === 1) {
          currentConsecutive++;
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
          currentConsecutive = 1;
        }
      } else {
        currentConsecutive = 1;
        maxConsecutive = 1;
      }
      lastDate = currentDate;
    }

    const daysSinceLastCommit =
      sortedDays.length > 0
        ? Math.floor(
            (Date.now() -
              new Date(sortedDays[sortedDays.length - 1]).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999;

    return {
      commitsPerWeek: Math.round(commits.length / weeks),
      weekendCommits,
      lateNightCommits,
      consecutiveDays: maxConsecutive,
      avgCommitsPerDay:
        commitsByDay.size > 0
          ? Math.round((commits.length / commitsByDay.size) * 10) / 10
          : 0,
      daysSinceLastCommit,
    };
  }

  private calculateWellnessScore(metrics: WellnessMetrics): number {
    let score = 100;

    if (metrics.commitsPerWeek > 50) score -= 15;
    if (metrics.commitsPerWeek > 30) score -= 10;

    if (metrics.weekendCommits > 4) score -= 15;
    if (metrics.weekendCommits > 0) score -= 5;

    if (metrics.lateNightCommits > 5) score -= 20;
    if (metrics.lateNightCommits > 0) score -= 5;

    if (metrics.consecutiveDays > 10) score -= 15;
    if (metrics.consecutiveDays > 7) score -= 10;

    // Only penalize inactivity when there is at least some history.
    if (metrics.daysSinceLastCommit !== 999) {
      if (metrics.daysSinceLastCommit > 7) score -= 15;
      if (metrics.daysSinceLastCommit > 3) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private generateInsights(metrics: WellnessMetrics): {
    insights: string[];
    suggestions: string[];
  } {
    const insights: string[] = [];
    const suggestions: string[] = [];

    if (metrics.lateNightCommits > 3) {
      insights.push(
        "Frequent late-night coding detected — potential sleep disruption",
      );
      suggestions.push("Encourage setting work-hour boundaries");
    }
    if (metrics.weekendCommits > 2) {
      insights.push(
        "Weekend work pattern suggests poor work-life balance",
      );
      suggestions.push("Discuss workload distribution with the team");
    }
    if (metrics.consecutiveDays > 7) {
      insights.push(
        "Long streak without days off — burnout risk elevated",
      );
      suggestions.push("Recommend taking a day off to recharge");
    }
    if (metrics.daysSinceLastCommit !== 999 && metrics.daysSinceLastCommit > 5) {
      insights.push(
        "Significant drop in activity — may indicate being stuck or disengaged",
      );
      suggestions.push("Schedule a 1:1 to check in on blockers");
    }
    if (metrics.commitsPerWeek > 40) {
      insights.push("Very high commit velocity — unsustainable pace");
      suggestions.push("Review sprint scope and redistribute tasks");
    }

    if (insights.length === 0) {
      insights.push("Activity pattern looks healthy");
      suggestions.push("Continue monitoring wellness metrics");
    }

    return { insights, suggestions };
  }
}
