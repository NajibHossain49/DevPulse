import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface CreateGoalData {
  title: string;
  description?: string;
  metric: string;
  target: number;
  deadline: Date;
}

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGoal(teamId: string, data: CreateGoalData) {
    return this.prisma.goal.create({
      data: { teamId, ...data },
    });
  }

  async getGoals(teamId: string) {
    return this.prisma.goal.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateGoalProgress(goalId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException("Goal not found");

    let current = 0;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    switch (goal.metric) {
      case "review_time": {
        const prs = await this.prisma.pullRequest.findMany({
          where: {
            project: { teamId: goal.teamId },
            reviewTime: { not: null },
            createdAt: { gte: since },
          },
          select: { reviewTime: true },
        });
        current =
          prs.length > 0
            ? prs.reduce((sum, p) => sum + (p.reviewTime as number), 0) /
              prs.length
            : 0;
        break;
      }
      case "merge_rate": {
        const prs = await this.prisma.pullRequest.findMany({
          where: { project: { teamId: goal.teamId }, createdAt: { gte: since } },
          select: { state: true },
        });
        current =
          prs.length > 0
            ? (prs.filter((p) => p.state === "merged").length / prs.length) * 100
            : 0;
        break;
      }
      case "pr_count": {
        current = await this.prisma.pullRequest.count({
          where: { project: { teamId: goal.teamId }, createdAt: { gte: since } },
        });
        break;
      }
      case "commit_count": {
        current = await this.prisma.commit.count({
          where: { project: { teamId: goal.teamId }, createdAt: { gte: since } },
        });
        break;
      }
      case "quality_score": {
        const prs = await this.prisma.pullRequest.findMany({
          where: {
            project: { teamId: goal.teamId },
            aiQualityScore: { not: null },
            createdAt: { gte: since },
          },
          select: { aiQualityScore: true },
        });
        current =
          prs.length > 0
            ? prs.reduce((sum, p) => sum + (p.aiQualityScore as number), 0) /
              prs.length
            : 0;
        break;
      }
    }

    // For "lower is better" metrics (review time) the target is a ceiling, so
    // being at or below it counts as achieved. All other metrics are goals to
    // reach or exceed.
    const lowerIsBetter = goal.metric === "review_time";
    const achieved = lowerIsBetter
      ? current > 0 && current <= goal.target
      : current >= goal.target;
    const status = achieved
      ? "achieved"
      : goal.deadline < new Date()
        ? "missed"
        : "active";

    return this.prisma.goal.update({
      where: { id: goalId },
      data: { current, status },
    });
  }

  async deleteGoal(goalId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException("Goal not found");
    await this.prisma.goal.delete({ where: { id: goalId } });
    return { success: true };
  }
}
