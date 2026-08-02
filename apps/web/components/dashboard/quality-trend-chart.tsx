"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { apiGetData } from "@/lib/api";
import type { TimelinePr } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { tooltipStyle } from "./chart-theme";

interface Point {
  label: string;
  aiQualityScore: number;
}

export function QualityTrendChart({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Point[] | null>(null);

  useEffect(() => {
    let active = true;
    apiGetData<TimelinePr[]>(`/analytics/timeline?projectId=${projectId}`)
      .then((prs) => {
        if (!active) return;
        const points = prs
          .filter((p) => p.aiQualityScore !== null)
          .reverse()
          .map((p) => ({
            label: format(new Date(p.createdAt), "MMM d"),
            aiQualityScore: p.aiQualityScore as number,
          }));
        setData(points);
      })
      .catch(() => active && setData([]));
    return () => {
      active = false;
    };
  }, [projectId]);

  if (data === null) return <Skeleton className="h-[300px] w-full" />;

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No AI analysis yet. Click &quot;Analyze All PRs&quot;.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          stroke="var(--border)"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          stroke="var(--border)"
        />
        <Tooltip {...tooltipStyle} />
        <ReferenceLine
          y={70}
          stroke="#22c55e"
          strokeDasharray="5 5"
          label={{ value: "Good", position: "insideTopRight", fill: "#22c55e", fontSize: 11 }}
        />
        <Area
          type="monotone"
          dataKey="aiQualityScore"
          name="Quality"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#qualityGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
