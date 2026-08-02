import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface BenchmarkData {
  metric: string;
  yourValue: number;
  industryAvg: number;
  top10Percent: number;
  percentile: number;
  unit: string;
}

@Injectable()
export class BenchmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async getBenchmarks(projectId: string): Promise<BenchmarkData[]> {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [prs, commits] = await Promise.all([
      this.prisma.pullRequest.findMany({
        where: { projectId, createdAt: { gte: since } },
        select: {
          state: true,
          reviewTime: true,
          additions: true,
          deletions: true,
        },
      }),
      this.prisma.commit.count({
        where: { projectId, createdAt: { gte: since } },
      }),
    ]);

    const yourMetrics = {
      reviewTime: this.avg(
        prs
          .filter((p) => p.reviewTime !== null)
          .map((p) => p.reviewTime as number),
      ),
      mergeRate:
        prs.length > 0
          ? (prs.filter((p) => p.state === "merged").length / prs.length) * 100
          : 0,
      prSize: this.avg(prs.map((p) => p.additions + p.deletions)),
      commitsPerWeek: commits / 4,
    };

    // Simulated industry benchmarks. In production these would be aggregated
    // (anonymized) from all tenants.
    return [
      {
        metric: "Average Review Time",
        yourValue: yourMetrics.reviewTime,
        industryAvg: 360,
        top10Percent: 120,
        percentile: this.calculatePercentile(
          yourMetrics.reviewTime,
          360,
          120,
          true,
        ),
        unit: "minutes",
      },
      {
        metric: "Merge Rate",
        yourValue: yourMetrics.mergeRate,
        industryAvg: 65,
        top10Percent: 85,
        percentile: this.calculatePercentile(
          yourMetrics.mergeRate,
          65,
          85,
          false,
        ),
        unit: "%",
      },
      {
        metric: "Average PR Size",
        yourValue: yourMetrics.prSize,
        industryAvg: 250,
        top10Percent: 100,
        percentile: this.calculatePercentile(
          yourMetrics.prSize,
          250,
          100,
          true,
        ),
        unit: "lines",
      },
      {
        metric: "Commits per Week",
        yourValue: yourMetrics.commitsPerWeek,
        industryAvg: 20,
        top10Percent: 40,
        percentile: this.calculatePercentile(
          yourMetrics.commitsPerWeek,
          20,
          40,
          false,
        ),
        unit: "commits",
      },
    ];
  }

  private calculatePercentile(
    value: number,
    avg: number,
    top10: number,
    lowerIsBetter: boolean,
  ): number {
    let percentile: number;
    if (lowerIsBetter) {
      if (value <= top10) percentile = 90 + ((top10 - value) / top10) * 10;
      else if (value <= avg)
        percentile = 50 + ((avg - value) / (avg - top10)) * 40;
      else percentile = 50 - ((value - avg) / avg) * 50;
    } else {
      if (value >= top10) percentile = 90 + ((value - top10) / top10) * 10;
      else if (value >= avg)
        percentile = 50 + ((value - avg) / (top10 - avg)) * 40;
      else percentile = 50 - ((avg - value) / avg) * 50;
    }
    return Math.max(0, Math.min(100, percentile));
  }

  private avg(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
