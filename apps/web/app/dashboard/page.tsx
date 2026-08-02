"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GitPullRequest,
  Clock,
  GitMerge,
  Users,
  FolderGit2,
  Plus,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { apiGet } from "@/lib/api";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface Team {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface Metrics {
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

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(true);
  const [hasProject, setHasProject] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const teamsRes = await apiGet<ApiEnvelope<Team[]>>("/teams");
        const team = teamsRes.data?.[0];
        if (!team) {
          if (active) setLoading(false);
          return;
        }

        const projectsRes = await apiGet<ApiEnvelope<Project[]>>(
          `/projects?teamId=${team.id}`,
        );
        const project = projectsRes.data?.[0];
        if (!project) {
          if (active) setLoading(false);
          return;
        }

        if (active) setHasProject(true);

        const metricsRes = await apiGet<ApiEnvelope<Metrics>>(
          `/analytics?projectId=${project.id}&period=30d`,
        );
        if (active) {
          setMetrics(metricsRes.data);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const userName = session?.user?.name ?? "there";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {userName}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your projects
        </p>
      </div>

      {!loading && !hasProject ? (
        <EmptyState
          icon={<FolderGit2 />}
          title="Connect Your First Project"
          description="Add a GitHub repository to start tracking pull requests, code quality, and team velocity."
          action={
            <Link
              href="/dashboard/projects"
              className={cn(buttonVariants({ size: "lg" }), "h-10 gap-2 px-5")}
            >
              <Plus className="size-4" />
              Add Project
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total PRs"
            value={metrics?.totalPRs ?? 0}
            icon={GitPullRequest}
            description="last 30 days"
            loading={loading}
            iconClassName="bg-blue-500/10 text-blue-500"
          />
          <MetricCard
            title="Avg Review Time"
            value={formatReviewTime(metrics?.avgReviewTime ?? null)}
            icon={Clock}
            description="first review"
            loading={loading}
            iconClassName="bg-yellow-500/10 text-yellow-500"
          />
          <MetricCard
            title="Merge Rate"
            value={metrics?.mergeRate != null ? `${metrics.mergeRate}%` : "—"}
            icon={GitMerge}
            description="merged / total"
            loading={loading}
            iconClassName="bg-green-500/10 text-green-500"
          />
          <MetricCard
            title="Active Contributors"
            value={metrics?.activeContributors ?? 0}
            icon={Users}
            description="last 30 days"
            loading={loading}
            iconClassName="bg-purple-500/10 text-purple-500"
          />
        </div>
      )}
    </div>
  );
}

function formatReviewTime(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days}d ${remHours}h` : `${days}d`;
}
