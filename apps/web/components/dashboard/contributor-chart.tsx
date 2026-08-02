"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { apiGetData } from "@/lib/api";
import type { Contributor } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { tooltipStyle } from "./chart-theme";

export function ContributorChart({
  projectId,
  period = "30d",
}: {
  projectId: string;
  period?: string;
}) {
  const [data, setData] = useState<Contributor[] | null>(null);

  useEffect(() => {
    let active = true;
    apiGetData<Contributor[]>(`/analytics/contributors?projectId=${projectId}&period=${period}`)
      .then((res) => active && setData(res))
      .catch(() => active && setData([]));
    return () => {
      active = false;
    };
  }, [projectId, period]);

  if (data === null) return <Skeleton className="h-[300px] w-full" />;

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No contributors yet.
      </div>
    );
  }

  const top = data.slice(0, 8);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={top} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="contributorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="var(--border)" />
        <XAxis
          dataKey="author"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          stroke="var(--border)"
          tickFormatter={(name: string) =>
            name.length > 10 ? `${name.slice(0, 10)}...` : name
          }
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          stroke="var(--border)"
          allowDecimals={false}
        />
        <Tooltip {...tooltipStyle} />
        <Bar
          dataKey="activityScore"
          name="Activity"
          fill="url(#contributorGradient)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
