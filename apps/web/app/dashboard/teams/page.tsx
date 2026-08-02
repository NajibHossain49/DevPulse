"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Users, GitBranch, UserRound } from "lucide-react";
import { apiGetData } from "@/lib/api";
import type { Team } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateTeamModal } from "@/components/teams/create-team-modal";
import { cn } from "@/lib/utils";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null);

  const load = useCallback(() => {
    apiGetData<Team[]>("/teams")
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
        <CreateTeamModal onCreated={load} />
      </div>

      {teams === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No teams yet"
          description="Create a team to start grouping your projects and collaborating with others."
          action={<CreateTeamModal onCreated={load} />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold leading-tight">{team.name}</h3>
                  <p className="text-sm text-muted-foreground">@{team.slug}</p>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="size-3.5" />
                    {team.projectCount} {team.projectCount === 1 ? "project" : "projects"}
                  </span>
                </div>

                {team.members && team.members.length > 0 && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserRound className="size-3.5" />
                    Owner: {team.members[0].user.name ?? team.members[0].user.email}
                  </p>
                )}

                <Link
                  href="/dashboard/projects"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  View projects
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
