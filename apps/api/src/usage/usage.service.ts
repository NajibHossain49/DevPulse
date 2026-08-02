import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PLAN_LIMITS, PlanType } from "../billing/plan.config";

export type UsageType = "project" | "team_member" | "ai_analysis";

function maxForType(plan: PlanType, type: UsageType): number {
  const limits = PLAN_LIMITS[plan];
  if (type === "project") return limits.maxProjects;
  if (type === "team_member") return limits.maxTeamMembers;
  return limits.maxAiAnalysisPerMonth;
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlan(teamId: string): Promise<PlanType> {
    const sub = await this.prisma.subscription.findUnique({
      where: { teamId },
    });
    return (sub?.plan as PlanType) || "free";
  }

  async getTeamIdForProject(projectId: string): Promise<string | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    return project?.teamId ?? null;
  }

  async checkLimit(teamId: string, type: UsageType): Promise<boolean> {
    const plan = await this.getPlan(teamId);
    const maxCount = maxForType(plan, type);

    // -1 means unlimited.
    if (maxCount === -1) return true;

    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usage = await this.prisma.usageRecord.findUnique({
      where: {
        teamId_type_period: { teamId, type, period: currentPeriod },
      },
    });

    const currentCount = usage?.count ?? 0;
    return currentCount < maxCount;
  }

  async incrementUsage(teamId: string, type: UsageType) {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    await this.prisma.usageRecord.upsert({
      where: {
        teamId_type_period: { teamId, type, period: currentPeriod },
      },
      create: {
        teamId,
        type,
        period: currentPeriod,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });
  }

  async getUsage(teamId: string) {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const records = await this.prisma.usageRecord.findMany({
      where: { teamId, period: currentPeriod },
    });
    const plan = await this.getPlan(teamId);
    const limits = PLAN_LIMITS[plan];

    return {
      plan,
      period: currentPeriod,
      projects: {
        used: records.find((r) => r.type === "project")?.count ?? 0,
        limit: limits.maxProjects,
      },
      teamMembers: {
        used: records.find((r) => r.type === "team_member")?.count ?? 0,
        limit: limits.maxTeamMembers,
      },
      aiAnalysis: {
        used: records.find((r) => r.type === "ai_analysis")?.count ?? 0,
        limit: limits.maxAiAnalysisPerMonth,
      },
      features: limits.features,
    };
  }
}
