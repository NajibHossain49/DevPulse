import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type DoraLevel = "elite" | "high" | "medium" | "low";

interface DoraMetric {
  value: number;
  level: DoraLevel;
  description: string;
}

export interface DoraMetrics {
  deploymentFrequency: DoraMetric;
  leadTimeForChanges: DoraMetric;
  changeFailureRate: DoraMetric;
  timeToRestore: DoraMetric;
  overall: {
    level: DoraLevel;
    score: number;
  };
}

@Injectable()
export class DoraService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateDoraMetrics(
    projectId: string,
    weeks = 4,
  ): Promise<DoraMetrics> {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    // 1. Deployment Frequency — commits per week (proxy for deployments).
    const mainCommits = await this.prisma.commit.count({
      where: { projectId, createdAt: { gte: since } },
    });
    const deploymentFrequency = mainCommits / weeks;

    // 2. Lead Time for Changes — PR open → merge time.
    const mergedPRs = await this.prisma.pullRequest.findMany({
      where: {
        projectId,
        state: "merged",
        createdAt: { gte: since },
        mergedAt: { not: null },
      },
      select: { createdAt: true, mergedAt: true },
    });
    const leadTimes = mergedPRs.map((pr) => hoursBetween(pr.createdAt, pr.mergedAt!));
    const avgLeadTime = average(leadTimes);

    // 3. Change Failure Rate — revert/rollback PRs / total PRs.
    const allPRs = await this.prisma.pullRequest.findMany({
      where: { projectId, createdAt: { gte: since } },
      select: { title: true },
    });
    const revertPRs = allPRs.filter(
      (pr) =>
        pr.title.toLowerCase().includes("revert") ||
        pr.title.toLowerCase().includes("rollback"),
    );
    const changeFailureRate =
      allPRs.length > 0 ? (revertPRs.length / allPRs.length) * 100 : 0;

    // 4. Time to Restore — bug-fix PR open → merge time.
    const fixPRs = await this.prisma.pullRequest.findMany({
      where: {
        projectId,
        state: "merged",
        createdAt: { gte: since },
        mergedAt: { not: null },
        title: { contains: "fix", mode: "insensitive" },
      },
      select: { createdAt: true, mergedAt: true },
    });
    const restoreTimes = fixPRs.map((pr) =>
      hoursBetween(pr.createdAt, pr.mergedAt!),
    );
    const avgRestoreTime = average(restoreTimes);

    const deploymentFrequencyMetric =
      this.classifyDeploymentFrequency(deploymentFrequency);
    const leadTimeMetric = this.classifyLeadTime(avgLeadTime);
    const changeFailureRateMetric =
      this.classifyChangeFailureRate(changeFailureRate);
    const timeToRestoreMetric = this.classifyTimeToRestore(avgRestoreTime);

    return {
      deploymentFrequency: deploymentFrequencyMetric,
      leadTimeForChanges: leadTimeMetric,
      changeFailureRate: changeFailureRateMetric,
      timeToRestore: timeToRestoreMetric,
      overall: this.calculateOverall([
        deploymentFrequencyMetric.level,
        leadTimeMetric.level,
        changeFailureRateMetric.level,
        timeToRestoreMetric.level,
      ]),
    };
  }

  private classifyDeploymentFrequency(freq: number): DoraMetric {
    if (freq >= 7)
      return {
        value: freq,
        level: "elite",
        description: "On-demand (multiple per day)",
      };
    if (freq >= 1)
      return {
        value: freq,
        level: "high",
        description: "Between once per day and once per week",
      };
    if (freq >= 0.25)
      return {
        value: freq,
        level: "medium",
        description: "Between once per week and once per month",
      };
    return {
      value: freq,
      level: "low",
      description: "Fewer than once per month",
    };
  }

  private classifyLeadTime(hours: number): DoraMetric {
    if (hours <= 1)
      return { value: hours, level: "elite", description: "Less than one hour" };
    if (hours <= 24)
      return { value: hours, level: "high", description: "Less than one day" };
    if (hours <= 168)
      return {
        value: hours,
        level: "medium",
        description: "Between one day and one week",
      };
    return { value: hours, level: "low", description: "More than one week" };
  }

  private classifyChangeFailureRate(rate: number): DoraMetric {
    if (rate <= 5)
      return { value: rate, level: "elite", description: "0-15% failure rate" };
    if (rate <= 10)
      return { value: rate, level: "high", description: "Low failure rate" };
    if (rate <= 20)
      return { value: rate, level: "medium", description: "Medium failure rate" };
    return { value: rate, level: "low", description: "High failure rate" };
  }

  private classifyTimeToRestore(hours: number): DoraMetric {
    if (hours <= 1)
      return { value: hours, level: "elite", description: "Less than one hour" };
    if (hours <= 24)
      return { value: hours, level: "high", description: "Less than one day" };
    if (hours <= 168)
      return {
        value: hours,
        level: "medium",
        description: "Less than one week",
      };
    return { value: hours, level: "low", description: "More than one week" };
  }

  private calculateOverall(levels: DoraLevel[]): {
    level: DoraLevel;
    score: number;
  } {
    const scores: Record<DoraLevel, number> = {
      elite: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    const total = levels.reduce((sum, level) => sum + scores[level], 0);
    const avg = total / levels.length;

    let level: DoraLevel = "low";
    if (avg >= 3.5) level = "elite";
    else if (avg >= 2.5) level = "high";
    else if (avg >= 1.5) level = "medium";

    return { level, score: Math.round((avg / 4) * 100) };
  }
}

function hoursBetween(start: Date, end: Date): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
