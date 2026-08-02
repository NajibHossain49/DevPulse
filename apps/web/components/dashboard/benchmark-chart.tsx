"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGetData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Benchmark {
  metric: string;
  yourValue: number;
  industryAvg: number;
  top10Percent: number;
  percentile: number;
  unit: string;
}

export default function BenchmarkChart({ projectId }: { projectId: string }) {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);

  const fetchBenchmarks = useCallback(async () => {
    try {
      const data = await apiGetData<Benchmark[]>(
        `/benchmarks?projectId=${projectId}`,
      );
      setBenchmarks(data);
    } catch {
      setBenchmarks([]);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBenchmarks();
  }, [fetchBenchmarks]);

  const chartData = benchmarks.map((b) => ({
    name: b.metric,
    You: Number(b.yourValue.toFixed(1)),
    "Industry Avg": b.industryAvg,
    "Top 10%": b.top10Percent,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>How You Compare</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-4">
          {benchmarks.map((b) => (
            <div
              key={b.metric}
              className="flex items-center justify-between rounded-lg bg-muted p-3"
            >
              <div>
                <p className="font-medium">{b.metric}</p>
                <p className="text-sm text-muted-foreground">
                  Your team: {b.yourValue.toFixed(1)} {b.unit}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    b.percentile >= 80
                      ? "default"
                      : b.percentile >= 50
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {b.percentile >= 90
                    ? "Top 10%"
                    : `${Math.round(b.percentile)}th percentile`}
                </Badge>
                {b.percentile >= 50 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend />
            <Bar dataKey="You" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Industry Avg" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Top 10%" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
