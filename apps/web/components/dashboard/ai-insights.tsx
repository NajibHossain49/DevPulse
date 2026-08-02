"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiPostData } from "@/lib/api";
import type { Insight } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightCard } from "./insight-card";

export function AiInsights({ projectId }: { projectId: string }) {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const data = await apiPostData<{ insights: Insight[] }>("/ai/insights", {
        projectId,
      });
      setInsights(data.insights ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          AI Insights
        </CardTitle>
        <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {insights ? "Regenerate" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && insights === null ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : insights === null ? (
          <p className="text-sm text-muted-foreground">
            Generate AI-powered insights based on your team&apos;s recent activity.
          </p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No insights available yet.</p>
        ) : (
          insights.map((insight, i) => <InsightCard key={i} {...insight} />)
        )}
      </CardContent>
    </Card>
  );
}
