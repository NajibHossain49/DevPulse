export const PLAN_LIMITS = {
  free: {
    maxProjects: 3,
    maxTeamMembers: 5,
    maxAiAnalysisPerMonth: 50,
    historyDays: 30,
    features: {
      aiInsights: true,
      webhooks: false,
      apiAccess: false,
      customReports: false,
      sso: false,
    },
  },
  pro: {
    maxProjects: -1, // unlimited
    maxTeamMembers: -1,
    maxAiAnalysisPerMonth: 500,
    historyDays: 90,
    features: {
      aiInsights: true,
      webhooks: true,
      apiAccess: true,
      customReports: true,
      sso: false,
    },
  },
  enterprise: {
    maxProjects: -1,
    maxTeamMembers: -1,
    maxAiAnalysisPerMonth: -1,
    historyDays: 365,
    features: {
      aiInsights: true,
      webhooks: true,
      apiAccess: true,
      customReports: true,
      sso: true,
    },
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
