"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { apiGetData, apiPost } from "@/lib/api";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectHeader({
  projectId,
  onSynced,
  backHref,
}: {
  projectId: string;
  onSynced?: () => void;
  backHref?: string;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = () => {
    apiGetData<Project>(`/projects/${projectId}`)
      .then(setProject)
      .catch(() => setProject(null));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const sync = async () => {
    setSyncing(true);
    toast.message("Syncing project data from GitHub...");
    try {
      await apiPost("/github/sync", { projectId });
      toast.success("Sync complete");
      load();
      onSynced?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (!project) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to project
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{project.name}</h1>
          <a
            href={`https://github.com/${project.githubRepo}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {project.githubRepo}
            <ExternalLink className="size-3.5" />
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {project.lastSyncedAt
              ? `Synced ${formatDistanceToNow(new Date(project.lastSyncedAt), {
                  addSuffix: true,
                })}`
              : "Never synced"}
          </span>
          <Button onClick={sync} disabled={syncing} variant="outline">
            <RefreshCw className={syncing ? "animate-spin" : undefined} />
            Sync Now
          </Button>
        </div>
      </div>
    </div>
  );
}
