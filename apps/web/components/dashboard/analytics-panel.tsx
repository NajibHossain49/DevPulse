"use client";

import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Period } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { VelocityChart } from "./velocity-chart";
import { ContributorChart } from "./contributor-chart";
import { ReviewTimeChart } from "./review-time-chart";
import { QualityTrendChart } from "./quality-trend-chart";
import DoraMetrics from "./dora-metrics";
import BenchmarkChart from "./benchmark-chart";

const PERIODS: Period[] = ["7d", "30d", "90d"];

export function AnalyticsPanel({ projectId }: { projectId: string }) {
  const [period, setPeriod] = useState<Period>("30d");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                period === p
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.message("Export coming soon")}
          >
            <Download />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw />
            Refresh data
          </Button>
        </div>
      </div>

      <div key={refreshKey} className="space-y-6">
        <DoraMetrics projectId={projectId} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <VelocityChart projectId={projectId} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Contributors</CardTitle>
            </CardHeader>
            <CardContent>
              <ContributorChart projectId={projectId} period={period} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewTimeChart projectId={projectId} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quality Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <QualityTrendChart projectId={projectId} />
          </CardContent>
        </Card>

        <BenchmarkChart projectId={projectId} />
      </div>
    </div>
  );
}
