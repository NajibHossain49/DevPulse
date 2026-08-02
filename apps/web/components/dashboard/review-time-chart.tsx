"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { apiGetData } from "@/lib/api";
import type { ReviewBucket } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { tooltipStyle } from "./chart-theme";

const COLORS = [
  "#22c55e",
  "#84cc16",
  "#eab308",
  "#f59e0b",
  "#f97316",
  "#ef4444",
];

export function ReviewTimeChart({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ReviewBucket[] | null>(null);

  useEffect(() => {
    let active = true;
    apiGetData<ReviewBucket[]>(`/analytics/review-time?projectId=${projectId}`)
      .then((res) => active && setData(res))
      .catch(() => active && setData([]));
    return () => {
      active = false;
    };
  }, [projectId]);

  if (data === null) return <Skeleton className="h-[300px] w-full" />;

  const hasData = data.some((d) => d.count > 0);
  if (!hasData) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No review data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          stroke="var(--border)"
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          stroke="var(--border)"
          allowDecimals={false}
        />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" name="PRs" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
