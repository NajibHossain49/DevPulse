"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { apiGetData } from "@/lib/api";
import type { VelocityPoint } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { tooltipStyle } from "./chart-theme";

export function VelocityChart({ projectId }: { projectId: string }) {
  const [data, setData] = useState<VelocityPoint[] | null>(null);

  useEffect(() => {
    let active = true;
    apiGetData<VelocityPoint[]>(`/analytics/velocity?projectId=${projectId}&weeks=8`)
      .then((res) => active && setData(res))
      .catch(() => active && setData([]));
    return () => {
      active = false;
    };
  }, [projectId]);

  if (data === null) return <Skeleton className="h-[300px] w-full" />;

  const hasData = data.some((d) => d.prs > 0 || d.commits > 0);
  if (!hasData) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No data available. Run a sync.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="var(--border)" />
        <XAxis
          dataKey="week"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          stroke="var(--border)"
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          stroke="var(--border)"
          allowDecimals={false}
        />
        <Tooltip {...tooltipStyle} />
        <Legend />
        <Line
          type="monotone"
          dataKey="prs"
          name="PRs"
          stroke="#3b82f6"
          strokeWidth={2}
          dot
        />
        <Line
          type="monotone"
          dataKey="commits"
          name="Commits"
          stroke="#22c55e"
          strokeWidth={2}
          dot
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
