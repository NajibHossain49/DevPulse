"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderGit2 } from "lucide-react";
import { apiGetData } from "@/lib/api";
import type { Project, Team } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectCard } from "@/components/projects/project-card";
import { AddProjectModal } from "@/components/projects/add-project-modal";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);

  const load = useCallback(async () => {
    try {
      const teams = await apiGetData<Team[]>("/teams");
      const lists = await Promise.all(
        teams.map((team) =>
          apiGetData<Project[]>(`/projects?teamId=${team.id}`).catch(() => []),
        ),
      );
      setProjects(lists.flat());
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          {projects !== null && (
            <Badge variant="secondary" className="h-6 px-2">
              {projects.length}
            </Badge>
          )}
        </div>
        <AddProjectModal onCreated={load} />
      </div>

      {projects === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 />}
          title="No projects yet"
          description="Add your first GitHub repository to start tracking pull requests, code quality, and team velocity."
          action={<AddProjectModal onCreated={load} />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
