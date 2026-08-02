"use client";

import { useEffect, useState } from "react";
import { GitPullRequest, Clock, GitMerge, Users } from "lucide-react";
import { apiGetData } from "@/lib/api";
import type { Metrics, Period } from "@/lib/types";
import { MetricCard } from "./metric-card";

function formatReviewTime(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

export function MetricsGrid({
  projectId,
  period = "30d",
}: {
  projectId: string;
  period?: Period;
}) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGetData<Metrics>(`/analytics?projectId=${projectId}&period=${period}`)
      .then((res) => active && setMetrics(res))
      .catch(() => active && setMetrics(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [projectId, period]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total PRs"
        value={metrics ? metrics.totalPRs : "—"}
        icon={GitPullRequest}
        description={metrics ? `${metrics.openPRs} open` : undefined}
        loading={loading}
        iconClassName="bg-blue-500/15 text-blue-500"
      />
      <MetricCard
        title="Avg Review Time"
        value={metrics ? formatReviewTime(metrics.avgReviewTime) : "—"}
        icon={Clock}
        loading={loading}
        iconClassName="bg-yellow-500/15 text-yellow-500"
      />
      <MetricCard
        title="Merge Rate"
        value={metrics && metrics.mergeRate !== null ? `${metrics.mergeRate}%` : "—"}
        icon={GitMerge}
        description={metrics ? `${metrics.mergedPRs} merged` : undefined}
        loading={loading}
        iconClassName="bg-green-500/15 text-green-500"
      />
      <MetricCard
        title="Active Contributors"
        value={metrics ? metrics.activeContributors : "—"}
        icon={Users}
        description={metrics ? `${metrics.commitsCount} commits` : undefined}
        loading={loading}
        iconClassName="bg-purple-500/15 text-purple-500"
      />
    </div>
  );
}
