import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const MAX_VALID_REVIEW_TIME = 10080; // 7 days in minutes

export interface ProjectMetrics {
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  closedPRs: number;
  avgReviewTime: number | null;
  avgPRSize: number | null;
  mergeRate: number | null;
  avgQualityScore: number | null;
  commitsCount: number;
  activeContributors: number;
}

export interface ContributorStat {
  author: string;
  prsOpened: number;
  prsMerged: number;
  commitCount: number;
  linesAdded: number;
  linesDeleted: number;
  activityScore: number;
}

export interface VelocityPoint {
  week: string;
  prs: number;
  commits: number;
  mergeRate: number;
}

export interface ReviewTimeBucket {
  label: string;
  count: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectMetrics(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProjectMetrics> {
    const [prs, commits] = await Promise.all([
      this.prisma.pullRequest.findMany({
        where: { projectId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.commit.findMany({
        where: { projectId, createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    const totalPRs = prs.length;
    const mergedPRs = prs.filter((p) => p.state === "merged").length;
    const openPRs = prs.filter((p) => p.state === "open").length;
    const closedPRs = prs.filter((p) => p.state === "closed").length;

    const reviewTimes = prs
      .filter((p) => p.reviewTime !== null && p.reviewTime <= MAX_VALID_REVIEW_TIME)
      .map((p) => p.reviewTime as number);
    const avgReviewTime = reviewTimes.length > 0 ? Math.round(average(reviewTimes)) : null;

    const prSizes = prs.map((p) => p.additions + p.deletions);
    const avgPRSize = prSizes.length > 0 ? Math.round(average(prSizes)) : null;

    const mergeRate =
      totalPRs > 0 ? Math.round((mergedPRs / totalPRs) * 100) : null;

    const qualityScores = prs
      .filter((p) => p.aiQualityScore !== null)
      .map((p) => p.aiQualityScore as number);
    const avgQualityScore =
      qualityScores.length > 0 ? Math.round(average(qualityScores)) : null;

    const commitsCount = commits.length;
    const activeContributors = new Set(commits.map((c) => c.author)).size;

    return {
      totalPRs,
      mergedPRs,
      openPRs,
      closedPRs,
      avgReviewTime,
      avgPRSize,
      mergeRate,
      avgQualityScore,
      commitsCount,
      activeContributors,
    };
  }

  async getContributorStats(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ContributorStat[]> {
    const [prs, commits] = await Promise.all([
      this.prisma.pullRequest.findMany({
        where: { projectId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.commit.findMany({
        where: { projectId, createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    const authors = new Set<string>();
    prs.forEach((p) => authors.add(p.author));
    commits.forEach((c) => authors.add(c.author));

    const stats: ContributorStat[] = [...authors].map((author) => {
      const authorPrs = prs.filter((p) => p.author === author);
      const authorCommits = commits.filter((c) => c.author === author);

      const prsOpened = authorPrs.length;
      const prsMerged = authorPrs.filter((p) => p.state === "merged").length;
      const commitCount = authorCommits.length;
      const linesAdded = sum(authorCommits.map((c) => c.additions));
      const linesDeleted = sum(authorCommits.map((c) => c.deletions));
      const activityScore = prsOpened * 10 + commitCount * 2;

      return {
        author,
        prsOpened,
        prsMerged,
        commitCount,
        linesAdded,
        linesDeleted,
        activityScore,
      };
    });

    return stats.sort((a, b) => b.activityScore - a.activityScore);
  }

  async getVelocityTrend(
    projectId: string,
    weeks = 8,
  ): Promise<VelocityPoint[]> {
    const endDate = new Date();
    const startDate = new Date(
      endDate.getTime() - weeks * 7 * 24 * 60 * 60 * 1000,
    );

    const [prs, commits] = await Promise.all([
      this.prisma.pullRequest.findMany({
        where: { projectId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.commit.findMany({
        where: { projectId, createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    const prTotals = new Map<string, number>();
    const prMerged = new Map<string, number>();
    const commitTotals = new Map<string, number>();

    for (const pr of prs) {
      const key = isoWeekKey(pr.createdAt);
      prTotals.set(key, (prTotals.get(key) ?? 0) + 1);
      if (pr.state === "merged") {
        prMerged.set(key, (prMerged.get(key) ?? 0) + 1);
      }
    }
    for (const commit of commits) {
      const key = isoWeekKey(commit.createdAt);
      commitTotals.set(key, (commitTotals.get(key) ?? 0) + 1);
    }

    const weekKeys = enumerateWeekKeys(startDate, endDate);

    return weekKeys.map((week) => {
      const total = prTotals.get(week) ?? 0;
      const merged = prMerged.get(week) ?? 0;
      return {
        week,
        prs: total,
        commits: commitTotals.get(week) ?? 0,
        mergeRate: total > 0 ? Math.round((merged / total) * 100) : 0,
      };
    });
  }

  async getReviewTimeDistribution(
    projectId: string,
  ): Promise<ReviewTimeBucket[]> {
    const prs = await this.prisma.pullRequest.findMany({
      where: { projectId, reviewTime: { not: null } },
      select: { reviewTime: true },
    });

    const buckets: ReviewTimeBucket[] = [
      { label: "< 1 hour", count: 0 },
      { label: "1-4 hours", count: 0 },
      { label: "4-24 hours", count: 0 },
      { label: "1-3 days", count: 0 },
      { label: "3-7 days", count: 0 },
      { label: "> 7 days", count: 0 },
    ];

    for (const pr of prs) {
      const rt = pr.reviewTime as number;
      if (rt < 60) buckets[0].count++;
      else if (rt < 240) buckets[1].count++;
      else if (rt < 1440) buckets[2].count++;
      else if (rt < 4320) buckets[3].count++;
      else if (rt < 10080) buckets[4].count++;
      else buckets[5].count++;
    }

    return buckets;
  }
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // shift to Thursday of this week
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week =
    1 +
    Math.round(
      (d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000),
    );
  return { year: d.getUTCFullYear(), week };
}

function isoWeekKey(date: Date): string {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function enumerateWeekKeys(startDate: Date, endDate: Date): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const step = 7 * 24 * 60 * 60 * 1000;

  for (let t = startDate.getTime(); t <= endDate.getTime(); t += step) {
    const key = isoWeekKey(new Date(t));
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }

  const endKey = isoWeekKey(endDate);
  if (!seen.has(endKey)) {
    keys.push(endKey);
  }

  return keys;
}
