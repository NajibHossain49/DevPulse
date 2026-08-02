"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetData } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Heart, Moon, Calendar, Activity } from "lucide-react";
import { toast } from "sonner";

const TEAM_STORAGE_KEY = "devpulse.currentTeamId";

interface WellnessMember {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  score: number;
  risk: "low" | "medium" | "high";
  metrics: {
    commitsPerWeek: number;
    weekendCommits: number;
    lateNightCommits: number;
    consecutiveDays: number;
    daysSinceLastCommit: number;
  };
  insights: string[];
  suggestions: string[];
}

interface WellnessData {
  teamAverage: number;
  members: WellnessMember[];
}

interface TeamSummary {
  id: string;
  name: string;
}

function riskColor(risk: string): string {
  return risk === "low"
    ? "bg-green-500"
    : risk === "medium"
      ? "bg-yellow-500"
      : "bg-red-500";
}

function riskBadge(risk: string) {
  if (risk === "low")
    return <Badge className="bg-green-500 text-white">Healthy</Badge>;
  if (risk === "medium")
    return <Badge className="bg-yellow-500 text-white">At Risk</Badge>;
  return <Badge variant="destructive">Burnout Risk</Badge>;
}

export default function WellnessPage() {
  const [data, setData] = useState<WellnessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWellness = useCallback(async () => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(TEAM_STORAGE_KEY)
          : null;
      const teams = await apiGetData<TeamSummary[]>("/teams");
      const teamId =
        teams.find((t) => t.id === stored)?.id ?? teams[0]?.id ?? null;
      if (!teamId) {
        setError("Create a team first to view wellness.");
        return;
      }
      const result = await apiGetData<WellnessData>(
        `/wellness/team?teamId=${teamId}`,
      );
      setData(result);
    } catch {
      setError("Failed to load wellness data");
      toast.error("Failed to load wellness data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWellness();
  }, [fetchWellness]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Wellness</h1>
          <p className="text-muted-foreground">
            Monitor developer wellbeing and prevent burnout
          </p>
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Wellness</h1>
          <p className="text-muted-foreground">
            Monitor developer wellbeing and prevent burnout
          </p>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {error ?? "No data available."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Wellness</h1>
        <p className="text-muted-foreground">
          Monitor developer wellbeing and prevent burnout
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team Wellness Average</CardTitle>
          <Heart className="h-5 w-5 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold">{data.teamAverage}</div>
            <div className="flex-1">
              <Progress value={data.teamAverage} className="h-3" />
              <p className="mt-1 text-sm text-muted-foreground">
                {data.teamAverage >= 70
                  ? "Team is healthy"
                  : data.teamAverage >= 40
                    ? "Some members need attention"
                    : "Immediate action recommended"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {data.members.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No team members with activity yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.members.map((member) => (
            <Card
              key={member.userId}
              className={member.risk === "high" ? "border-red-500" : ""}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar>
                  {member.image ? (
                    <AvatarImage src={member.image} alt="" />
                  ) : null}
                  <AvatarFallback>
                    {(member.name?.[0] ?? member.email[0]).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-base">
                    {member.name || member.email}
                  </CardTitle>
                  {riskBadge(member.risk)}
                </div>
                <div
                  className={`flex size-12 items-center justify-center rounded-full font-bold text-white ${riskColor(member.risk)}`}
                >
                  {member.score}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span>{member.metrics.commitsPerWeek}/week</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{member.metrics.consecutiveDays} day streak</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-muted-foreground" />
                    <span>{member.metrics.lateNightCommits} late nights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {member.metrics.daysSinceLastCommit >= 999
                        ? "no"
                        : member.metrics.daysSinceLastCommit}
                      d inactive
                    </span>
                  </div>
                </div>

                {member.risk !== "low" && (
                  <div className="space-y-2 rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium">Insights:</p>
                    {member.insights.map((insight, i) => (
                      <p key={i} className="text-sm text-muted-foreground">
                        • {insight}
                      </p>
                    ))}
                    <p className="mt-2 text-sm font-medium">Suggestions:</p>
                    {member.suggestions.map((suggestion, i) => (
                      <p key={i} className="text-sm text-green-600">
                        → {suggestion}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
