"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGetData, apiPostData, apiDeleteData } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Target,
  Plus,
  Trash2,
  TrendingUp,
  CheckCircle,
  XCircle,
} from "lucide-react";

const TEAM_STORAGE_KEY = "devpulse.currentTeamId";

const METRIC_LABELS: Record<string, string> = {
  review_time: "Review Time (minutes)",
  merge_rate: "Merge Rate (%)",
  pr_count: "PR Count",
  commit_count: "Commit Count",
  quality_score: "Quality Score",
};

interface Goal {
  id: string;
  title: string;
  description: string | null;
  metric: string;
  target: number;
  current: number;
  deadline: string;
  status: string;
}

interface TeamSummary {
  id: string;
  name: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    metric: "review_time",
    target: "",
    deadline: "",
  });

  const loadGoals = useCallback(async () => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(TEAM_STORAGE_KEY)
          : null;
      const teams = await apiGetData<TeamSummary[]>("/teams");
      const resolved =
        teams.find((t) => t.id === stored)?.id ?? teams[0]?.id ?? null;
      if (!resolved) {
        setError("Create a team first to set goals.");
        setLoaded(true);
        return;
      }
      setTeamId(resolved);

      const list = await apiGetData<Goal[]>(`/goals?teamId=${resolved}`);
      // Recompute progress for each goal so values reflect current metrics.
      const refreshed = await Promise.all(
        list.map((g) =>
          apiPostData<Goal>(`/goals/${g.id}/progress`, {}).catch(() => g),
        ),
      );
      setGoals(refreshed);
    } catch {
      setError("Failed to load goals");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  async function createGoal() {
    if (!teamId) return;
    if (!newGoal.title.trim() || !newGoal.target || !newGoal.deadline) {
      toast.error("Title, target and deadline are required");
      return;
    }
    setSaving(true);
    try {
      await apiPostData("/goals", {
        teamId,
        title: newGoal.title,
        description: newGoal.description || undefined,
        metric: newGoal.metric,
        target: parseFloat(newGoal.target),
        deadline: new Date(newGoal.deadline).toISOString(),
      });
      setDialogOpen(false);
      setNewGoal({
        title: "",
        description: "",
        metric: "review_time",
        target: "",
        deadline: "",
      });
      await loadGoals();
      toast.success("Goal created");
    } catch {
      toast.error("Failed to create goal");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(id: string) {
    try {
      await apiDeleteData(`/goals/${id}`);
      setGoals((prev) => prev.filter((g) => g.id !== id));
      toast.success("Goal deleted");
    } catch {
      toast.error("Failed to delete goal");
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case "achieved":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" /> Achieved
          </Badge>
        );
      case "missed":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" /> Missed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <TrendingUp className="mr-1 h-3 w-3" /> In Progress
          </Badge>
        );
    }
  }

  function unitFor(metric: string): string {
    if (metric === "review_time") return "min";
    if (metric === "merge_rate") return "%";
    return "";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goals</h1>
          <p className="text-muted-foreground">
            Track team objectives and metrics
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button disabled={!teamId}>
                <Plus className="mr-2 h-4 w-4" /> New Goal
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newGoal.title}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, title: e.target.value })
                  }
                  placeholder="Reduce review time"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newGoal.description}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, description: e.target.value })
                  }
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select
                  value={newGoal.metric}
                  onValueChange={(v) =>
                    setNewGoal({ ...newGoal, metric: v as string })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v: string | null) =>
                        METRIC_LABELS[v ?? ""] ?? "Select metric"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(METRIC_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <Input
                  type="number"
                  value={newGoal.target}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, target: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, deadline: e.target.value })
                  }
                />
              </div>
              <Button
                onClick={createGoal}
                disabled={saving}
                className="w-full"
              >
                {saving ? "Creating..." : "Create Goal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!loaded ? (
        <div className="grid gap-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No goals yet. Create one to start tracking objectives.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {goals.map((goal) => {
            const progress =
              goal.target > 0
                ? Math.min(100, (goal.current / goal.target) * 100)
                : 0;
            return (
              <Card key={goal.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5" />
                      {goal.title}
                    </CardTitle>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground">
                        {goal.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(goal.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>{METRIC_LABELS[goal.metric]}</span>
                    <span className="font-medium">
                      {goal.current.toFixed(1)} / {goal.target}{" "}
                      {unitFor(goal.metric)}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{progress.toFixed(0)}% of target</span>
                    <span>
                      Deadline:{" "}
                      {new Date(goal.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
