export interface TeamMemberUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface TeamMember {
  id: string;
  role: string;
  user: TeamMemberUser;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId?: string;
  memberCount: number;
  projectCount: number;
  members?: TeamMember[];
  projects?: Pick<Project, "id" | "name" | "githubRepo">[];
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  githubRepo: string;
  teamId?: string;
  lastSyncedAt: string | null;
  prCount?: number;
  createdAt?: string;
}

export interface Metrics {
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

export interface TimelinePr {
  id: string;
  title: string;
  author: string;
  state: string;
  createdAt: string;
  mergedAt: string | null;
  reviewTime: number | null;
  aiQualityScore: number | null;
}

export interface Contributor {
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

export interface ReviewBucket {
  label: string;
  count: number;
}

export type InsightSeverity = "high" | "medium" | "low";

export interface Insight {
  title: string;
  description: string;
  severity: InsightSeverity;
}

export interface PrAnalysis {
  score: number;
  summary: string;
  suggestions: string[];
}

export type Period = "7d" | "30d" | "90d";
