import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AchievementDef {
  type: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: UserStats) => boolean;
}

interface UserStats {
  prsMerged: number;
  avgReviewTime: number;
  avgQualityScore: number;
  commits: number;
  weekendCommits: number;
  lateNightCommits: number;
  earlyBirdCommits: number;
  consecutiveDays: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    type: "speed_demon",
    title: "Speed Demon",
    description: "Average review time under 2 hours for 10+ PRs",
    icon: "Zap",
    condition: (s) =>
      s.avgReviewTime > 0 && s.avgReviewTime < 120 && s.prsMerged >= 10,
  },
  {
    type: "quality_champion",
    title: "Quality Champion",
    description: "10 PRs with AI quality score above 90",
    icon: "Award",
    condition: (s) => s.avgQualityScore >= 90 && s.prsMerged >= 10,
  },
  {
    type: "merge_master",
    title: "Merge Master",
    description: "50 merged PRs",
    icon: "GitMerge",
    condition: (s) => s.prsMerged >= 50,
  },
  {
    type: "night_owl",
    title: "Night Owl",
    description: "5 commits after 10 PM",
    icon: "Moon",
    condition: (s) => s.lateNightCommits >= 5,
  },
  {
    type: "early_bird",
    title: "Early Bird",
    description: "5 commits before 8 AM",
    icon: "Sunrise",
    condition: (s) => s.earlyBirdCommits >= 5,
  },
  {
    type: "streak",
    title: "7-Day Streak",
    description: "Commits for 7 consecutive days",
    icon: "Flame",
    condition: (s) => s.consecutiveDays >= 7,
  },
  {
    type: "reviewer",
    title: "Helpful Reviewer",
    description: "Reviewed 20 PRs",
    icon: "Eye",
    condition: (s) => s.prsMerged >= 20,
  },
];

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  async checkAchievements(userId: string) {
    const stats = await this.calculateUserStats(userId);
    const existing = await this.prisma.achievement.findMany({
      where: { userId },
      select: { type: true },
    });
    const existingTypes = new Set(existing.map((a) => a.type));

    const newAchievements = [];
    for (const def of ACHIEVEMENTS) {
      if (!existingTypes.has(def.type) && def.condition(stats)) {
        const achievement = await this.prisma.achievement.create({
          data: {
            userId,
            type: def.type,
            title: def.title,
            description: def.description,
            icon: def.icon,
          },
        });
        newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  async getAchievements(userId: string) {
    return this.prisma.achievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: "desc" },
    });
  }

  async getLeaderboard(teamId: string, metric: string, period?: string) {
    const currentPeriod = period || this.getCurrentWeek();
    await this.calculateLeaderboard(teamId, metric, currentPeriod);

    return this.prisma.leaderboardEntry.findMany({
      where: { teamId, period: currentPeriod, metric },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { score: "desc" },
      take: 10,
    });
  }

  private authorCandidates(user: {
    name: string | null;
    email: string;
  }): string[] {
    return [user.name, user.email.split("@")[0]]
      .filter((v): v is string => !!v)
      .map((v) => v.toLowerCase());
  }

  private async calculateUserStats(userId: string): Promise<UserStats> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return {
        prsMerged: 0,
        avgReviewTime: 0,
        avgQualityScore: 0,
        commits: 0,
        weekendCommits: 0,
        lateNightCommits: 0,
        earlyBirdCommits: 0,
        consecutiveDays: 0,
      };
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const candidates = this.authorCandidates(user);

    const [allPrs, allCommits] = await Promise.all([
      this.prisma.pullRequest.findMany({
        where: { createdAt: { gte: since } },
      }),
      this.prisma.commit.findMany({
        where: { createdAt: { gte: since } },
      }),
    ]);

    const prs = allPrs.filter((p) =>
      candidates.includes((p.author ?? "").toLowerCase()),
    );
    const commits = allCommits.filter((c) =>
      candidates.includes((c.author ?? "").toLowerCase()),
    );

    const reviewTimes = prs
      .filter((p) => p.reviewTime !== null)
      .map((p) => p.reviewTime as number);
    const qualityScores = prs
      .filter((p) => p.aiQualityScore !== null)
      .map((p) => p.aiQualityScore as number);

    const days = new Set(
      commits.map((c) => c.createdAt.toISOString().split("T")[0]),
    );
    const sortedDays = Array.from(days).sort();
    let maxStreak = sortedDays.length > 0 ? 1 : 0;
    let currentStreak = sortedDays.length > 0 ? 1 : 0;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return {
      prsMerged: prs.filter((p) => p.state === "merged").length,
      avgReviewTime:
        reviewTimes.length > 0
          ? reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length
          : 0,
      avgQualityScore:
        qualityScores.length > 0
          ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
          : 0,
      commits: commits.length,
      weekendCommits: commits.filter((c) => {
        const day = new Date(c.createdAt).getDay();
        return day === 0 || day === 6;
      }).length,
      lateNightCommits: commits.filter((c) => {
        const hour = new Date(c.createdAt).getHours();
        return hour >= 22 || hour <= 5;
      }).length,
      earlyBirdCommits: commits.filter((c) => {
        const hour = new Date(c.createdAt).getHours();
        return hour < 8;
      }).length,
      consecutiveDays: maxStreak,
    };
  }

  private async calculateLeaderboard(
    teamId: string,
    metric: string,
    period: string,
  ) {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: true },
    });

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const scored: { userId: string; score: number }[] = [];

    for (const member of members) {
      const candidates = this.authorCandidates(member.user);
      let score = 0;

      switch (metric) {
        case "prs_merged": {
          const prs = await this.prisma.pullRequest.findMany({
            where: {
              state: "merged",
              createdAt: { gte: since },
              project: { teamId },
            },
            select: { author: true },
          });
          score = prs.filter((p) =>
            candidates.includes((p.author ?? "").toLowerCase()),
          ).length;
          break;
        }
        case "commits": {
          const commits = await this.prisma.commit.findMany({
            where: { createdAt: { gte: since }, project: { teamId } },
            select: { author: true },
          });
          score = commits.filter((c) =>
            candidates.includes((c.author ?? "").toLowerCase()),
          ).length;
          break;
        }
        case "quality_score": {
          const prs = await this.prisma.pullRequest.findMany({
            where: {
              aiQualityScore: { not: null },
              createdAt: { gte: since },
              project: { teamId },
            },
            select: { author: true, aiQualityScore: true },
          });
          const mine = prs.filter((p) =>
            candidates.includes((p.author ?? "").toLowerCase()),
          );
          score =
            mine.length > 0
              ? Math.round(
                  mine.reduce((s, p) => s + (p.aiQualityScore as number), 0) /
                    mine.length,
                )
              : 0;
          break;
        }
        default:
          score = 0;
      }

      scored.push({ userId: member.userId, score });

      await this.prisma.leaderboardEntry.upsert({
        where: {
          teamId_userId_period_metric: {
            teamId,
            userId: member.userId,
            period,
            metric,
          },
        },
        create: {
          teamId,
          userId: member.userId,
          period,
          metric,
          score,
        },
        update: { score },
      });
    }

    scored.sort((a, b) => b.score - a.score);
    await Promise.all(
      scored.map((entry, index) =>
        this.prisma.leaderboardEntry.update({
          where: {
            teamId_userId_period_metric: {
              teamId,
              userId: entry.userId,
              period,
              metric,
            },
          },
          data: { rank: index + 1 },
        }),
      ),
    );
  }

  private getCurrentWeek(): string {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const week = Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
    return `${now.getFullYear()}-W${week.toString().padStart(2, "0")}`;
  }
}
