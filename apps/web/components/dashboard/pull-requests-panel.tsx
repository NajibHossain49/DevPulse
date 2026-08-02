"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiPostData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PrTable } from "./pr-table";

export function PullRequestsPanel({ projectId }: { projectId: string }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const batchAnalyze = async () => {
    setAnalyzing(true);
    toast.message("Analyzing PRs...");
    try {
      const result = await apiPostData<{ analyzed: number; failed: number }>(
        "/ai/batch-analyze",
        { projectId },
      );
      toast.success(
        `Analyzed ${result.analyzed} PR${result.analyzed === 1 ? "" : "s"}` +
          (result.failed ? `, ${result.failed} failed` : ""),
      );
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Batch analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={batchAnalyze} disabled={analyzing}>
          {analyzing ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Analyze All Unanalyzed PRs
        </Button>
      </div>
      <PrTable key={reloadKey} projectId={projectId} />
    </div>
  );
}
