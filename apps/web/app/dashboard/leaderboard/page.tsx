"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGetData, apiPostData } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award } from "lucide-react";
import { toast } from "sonner";

const TEAM_STORAGE_KEY = "devpulse.currentTeamId";

interface LeaderboardEntry {
  userId: string;
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
  score: number;
  rank: number | null;
}

interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

interface TeamSummary {
  id: string;
  name: string;
}

const METRIC_LABELS: Record<string, string> = {
  prs_merged: "PRs Merged",
  commits: "Commits",
  quality_score: "Quality Score",
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [metric, setMetric] = useState("prs_merged");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveTeamId = useCallback(async () => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(TEAM_STORAGE_KEY)
        : null;
    const teams = await apiGetData<TeamSummary[]>("/teams");
    return teams.find((t) => t.id === stored)?.id ?? teams[0]?.id ?? null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const id = await resolveTeamId();
      if (!id) {
        toast.error("Create a team first");
        return;
      }
      setTeamId(id);

      const [board, unlocked, check] = await Promise.all([
        apiGetData<LeaderboardEntry[]>(
          `/gamification/leaderboard?teamId=${id}&metric=${metric}`,
        ),
        apiGetData<Achievement[]>("/gamification/achievements"),
        apiPostData<{ newAchievements: Achievement[] }>(
          "/gamification/check",
          {},
        ).catch(() => ({ newAchievements: [] as Achievement[] })),
      ]);

      setLeaderboard(board);
      setAchievements(unlocked);

      for (const a of check.newAchievements) {
        toast.success(`Achievement Unlocked: ${a.title}!`, {
          description: a.description,
        });
      }
      if (check.newAchievements.length > 0) {
        const refreshed = await apiGetData<Achievement[]>(
          "/gamification/achievements",
        );
        setAchievements(refreshed);
      }
    } catch {
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [metric, resolveTeamId]);

  useEffect(() => {
    load();
  }, [load]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="w-5 text-center text-sm text-muted-foreground">
            {index + 1}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Compete and earn achievements</p>
      </div>

      <Tabs defaultValue="leaderboard">
        <TabsList>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="achievements">
            My Achievements ({achievements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(METRIC_LABELS).map(([key, label]) => (
              <Badge
                key={key}
                variant={metric === key ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setMetric(key)}
              >
                {label}
              </Badge>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : !teamId || leaderboard.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No leaderboard data yet. Sync a project and start merging PRs.
                </p>
              ) : (
                leaderboard.map((entry, index) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-4 p-4 ${
                      index < 3 ? "bg-muted/50" : ""
                    } ${
                      index !== leaderboard.length - 1 ? "border-b" : ""
                    }`}
                  >
                    {getRankIcon(index)}
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.user.image || undefined} />
                      <AvatarFallback>
                        {entry.user.name?.[0] || entry.user.email[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {entry.user.name || entry.user.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {METRIC_LABELS[metric]}
                      </p>
                    </div>
                    <div className="text-2xl font-bold">{entry.score}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          {achievements.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No achievements yet. Keep shipping to unlock badges.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement) => (
                <Card key={achievement.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {achievement.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {achievement.description}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Unlocked{" "}
                      {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
