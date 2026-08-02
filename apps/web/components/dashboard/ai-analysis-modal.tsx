"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { apiPostData } from "@/lib/api";
import type { PrAnalysis, TimelinePr } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function scoreColor(score: number): string {
  if (score > 70) return "#22c55e";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="relative flex size-32 items-center justify-center">
      <svg className="size-32 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <span
        className="absolute text-4xl font-bold tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

export function AiAnalysisModal({
  projectId,
  pr,
  open,
  onClose,
}: {
  projectId: string;
  pr: TimelinePr | null;
  open: boolean;
  onClose: () => void;
}) {
  const [analysis, setAnalysis] = useState<PrAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !pr) return;
    let active = true;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    apiPostData<PrAnalysis>("/ai/analyze", { projectId, prId: pr.id })
      .then((res) => active && setAnalysis(res))
      .catch((err) =>
        active && setError(err instanceof Error ? err.message : "Analysis failed"),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, pr, projectId]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6 leading-snug">
            {pr?.title ?? "PR Analysis"}
          </DialogTitle>
          <DialogDescription>AI-powered code quality review</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Skeleton className="size-32 rounded-full" />
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : analysis ? (
          <div className="space-y-5">
            <div className="flex justify-center">
              <ScoreRing score={analysis.score} />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {analysis.summary}
            </p>
            {analysis.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Suggestions</h4>
                <ul className="space-y-2">
                  {analysis.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2
                        className={cn("mt-0.5 size-4 shrink-0 text-primary")}
                      />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
