"use client";

import Link from "next/link";
import { Github, GitPullRequest, ArrowRight, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Project } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ProjectCard({ project }: { project: Project }) {
  const synced = Boolean(project.lastSyncedAt);

  return (
    <Link href={`/dashboard/projects/${project.id}`} className="group block">
      <Card className="transition-all group-hover:shadow-md group-hover:ring-foreground/20">
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <h3 className="truncate text-lg font-semibold leading-tight">
                {project.name}
              </h3>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Github className="size-3.5 shrink-0" />
                <span className="truncate">{project.githubRepo}</span>
              </p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <GitPullRequest className="size-3.5" />
                {project.prCount ?? 0} PRs
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {synced
                  ? formatDistanceToNow(new Date(project.lastSyncedAt as string), {
                      addSuffix: true,
                    })
                  : "Never synced"}
              </span>
            </div>
            <Badge
              className={cn(
                synced
                  ? "bg-green-500/15 text-green-500"
                  : "bg-yellow-500/15 text-yellow-500",
              )}
            >
              {synced ? "Connected" : "Sync needed"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
