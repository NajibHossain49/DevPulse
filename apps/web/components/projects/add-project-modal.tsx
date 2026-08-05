"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiGetData, apiPost } from "@/lib/api";
import type { Team, Project } from "@/lib/types";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const REPO_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

export function AddProjectModal({
  defaultTeamId,
  onCreated,
}: {
  defaultTeamId?: string;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [teamId, setTeamId] = useState(defaultTeamId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiGetData<Team[]>("/teams")
      .then((res) => {
        setTeams(res);
        if (!teamId && res.length > 0) setTeamId(res[0].id);
      })
      .catch(() => setTeams([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reset = () => {
    setName("");
    setGithubRepo("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    if (!REPO_REGEX.test(githubRepo.trim())) {
      setError("Repository must be in the format owner/repo (e.g. facebook/react).");
      return;
    }
    if (!teamId) {
      setError("Please select a team.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiPost<{ data: Project }>("/projects", {
        name: name.trim(),
        githubRepo: githubRepo.trim(),
        teamId,
        provider: "github",
      });
      toast.success("Project created");

      const projectId = created.data.id;
      apiPost("/github/sync", { projectId }).catch(() => {
        toast.error("Project created, but initial sync failed. Try 'Sync Now'.");
      });
      toast.message("Syncing project data from GitHub...");

      setOpen(false);
      reset();
      router.refresh();
      onCreated?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create project";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <Plus />
            Add Project
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a project</DialogTitle>
          <DialogDescription>
            Connect a GitHub repository to start tracking analytics.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              placeholder="My Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-repo">GitHub repository</Label>
            <Input
              id="project-repo"
              placeholder="owner/repo"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Team</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    teams.find((t) => t.id === value)?.name ?? "Select a team"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : null}
              {submitting ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
