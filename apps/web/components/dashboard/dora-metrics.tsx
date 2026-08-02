"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGetData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Rocket, Clock, AlertTriangle, Wrench, Trophy } from "lucide-react";

interface DoraMetric {
  value: number;
  level: string;
  description: string;
}

interface DoraData {
  deploymentFrequency: DoraMetric;
  leadTimeForChanges: DoraMetric;
  changeFailureRate: DoraMetric;
  timeToRestore: DoraMetric;
  overall: { level: string; score: number };
}

function levelColor(level: string): string {
  switch (level) {
    case "elite":
      return "bg-purple-500";
    case "high":
      return "bg-green-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function overallCopy(level: string): string {
  switch (level) {
    case "elite":
      return "World-class performance";
    case "high":
      return "Strong performance";
    case "medium":
      return "Room for improvement";
    default:
      return "Significant improvements needed";
  }
}

export default function DoraMetrics({ projectId }: { projectId: string }) {
  const [data, setData] = useState<DoraData | null>(null);
  const [error, setError] = useState(false);

  const fetchDora = useCallback(async () => {
    try {
      const result = await apiGetData<DoraData>(
        `/analytics/dora?projectId=${projectId}`,
      );
      setData(result);
    } catch {
      setError(true);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDora();
  }, [fetchDora]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Could not load DORA metrics.
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: "Deployment Frequency",
      icon: Rocket,
      value: data.deploymentFrequency.value.toFixed(1),
      unit: "per week",
      level: data.deploymentFrequency.level,
      description: data.deploymentFrequency.description,
    },
    {
      title: "Lead Time for Changes",
      icon: Clock,
      value: data.leadTimeForChanges.value.toFixed(1),
      unit: "hours",
      level: data.leadTimeForChanges.level,
      description: data.leadTimeForChanges.description,
    },
    {
      title: "Change Failure Rate",
      icon: AlertTriangle,
      value: data.changeFailureRate.value.toFixed(1),
      unit: "%",
      level: data.changeFailureRate.level,
      description: data.changeFailureRate.description,
    },
    {
      title: "Time to Restore",
      icon: Wrench,
      value: data.timeToRestore.value.toFixed(1),
      unit: "hours",
      level: data.timeToRestore.level,
      description: data.timeToRestore.description,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            DORA Performance
          </CardTitle>
          <Badge className={levelColor(data.overall.level)}>
            {data.overall.level.toUpperCase()}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">{data.overall.score}/100</div>
            <div className="flex-1">
              <Progress value={data.overall.score} className="h-3" />
              <p className="mt-1 text-sm text-muted-foreground">
                {overallCopy(data.overall.level)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <metric.icon className="h-4 w-4 text-muted-foreground" />
                {metric.title}
              </CardTitle>
              <Badge className={levelColor(metric.level)}>{metric.level}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metric.value}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {metric.unit}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
