"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown, Check, Users } from "lucide-react";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Team {
  id: string;
  name: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

const STORAGE_KEY = "devpulse.currentTeamId";

export function TeamSwitcher() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiGet<ApiEnvelope<Team[]>>("/teams")
      .then((res) => {
        if (!active) return;
        const list = res.data ?? [];
        setTeams(list);
        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem(STORAGE_KEY)
            : null;
        const initial =
          list.find((t) => t.id === stored)?.id ?? list[0]?.id ?? null;
        setCurrentId(initial);
      })
      .catch(() => {
        if (active) setTeams([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectTeam = (id: string) => {
    setCurrentId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  };

  if (teams === null) {
    return <Skeleton className="h-8 w-40" />;
  }

  const current = teams.find((t) => t.id === currentId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2" />
        }
      >
        <Users className="size-4" />
        <span className="max-w-32 truncate">
          {current?.name ?? "No team"}
        </span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Teams</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {teams.length === 0 ? (
          <DropdownMenuItem disabled>No teams yet</DropdownMenuItem>
        ) : (
          teams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => selectTeam(team.id)}
              className="justify-between"
            >
              <span className="truncate">{team.name}</span>
              {team.id === currentId && <Check className="size-4" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
