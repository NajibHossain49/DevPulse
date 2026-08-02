"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitPullRequest,
  GitCommit,
  RefreshCw,
  MessageSquare,
  Bot,
} from "lucide-react";

type ActivityType =
  | "pr_opened"
  | "pr_merged"
  | "pr_closed"
  | "commit_pushed"
  | "sync_completed"
  | "ai_review"
  | "comment";

interface ActivityItem {
  id: string;
  type: ActivityType;
  message: string;
  author: string;
  timestamp: string;
  projectId?: string;
}

interface ActivityPayload {
  type?: string;
  action?: string;
  projectId?: string;
  data?: {
    prTitle?: string;
    author?: string;
    timestamp?: string;
  };
  message?: string;
}

interface SyncPayload {
  prsSynced: number;
  commitsSynced: number;
  timestamp: string;
}

export default function ActivityFeed({
  teamId,
  projectId,
}: {
  teamId?: string;
  projectId?: string;
}) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const socket = getSocket();

    const join = () => {
      if (teamId) socket.emit("join_team", teamId);
      if (projectId) socket.emit("join_project", projectId);
    };

    const onActivity = (data: ActivityPayload) => {
      setActivities((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random()}`,
            type: mapEventType(data.type, data.action),
            message: formatMessage(data),
            author: data.data?.author || "System",
            timestamp: data.data?.timestamp || new Date().toISOString(),
            projectId: data.projectId,
          },
          ...prev,
        ].slice(0, 50),
      );
    };

    const onSync = (data: SyncPayload) => {
      setActivities((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random()}`,
            type: "sync_completed" as const,
            message: `Sync completed: ${data.prsSynced} PRs, ${data.commitsSynced} commits`,
            author: "DevPulse",
            timestamp: data.timestamp,
          },
          ...prev,
        ].slice(0, 50),
      );
    };

    socket.on("connect", join);
    socket.on("activity", onActivity);
    socket.on("sync_completed", onSync);
    // If the shared socket is already connected, join the rooms immediately.
    if (socket.connected) join();

    return () => {
      socket.off("connect", join);
      socket.off("activity", onActivity);
      socket.off("sync_completed", onSync);
    };
  }, [teamId, projectId]);

  const filteredActivities =
    filter === "all"
      ? activities
      : activities.filter((a) => a.type.includes(filter));

  const getIcon = (type: ActivityType) => {
    switch (type) {
      case "pr_opened":
        return <GitPullRequest className="h-4 w-4 text-blue-500" />;
      case "pr_merged":
        return <GitPullRequest className="h-4 w-4 text-green-500" />;
      case "pr_closed":
        return <GitPullRequest className="h-4 w-4 text-red-500" />;
      case "commit_pushed":
        return <GitCommit className="h-4 w-4 text-purple-500" />;
      case "sync_completed":
        return <RefreshCw className="h-4 w-4 text-orange-500" />;
      case "ai_review":
        return <Bot className="h-4 w-4 text-cyan-500" />;
      case "comment":
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
      default:
        return <GitPullRequest className="h-4 w-4" />;
    }
  };

  const getBadge = (type: ActivityType) => {
    switch (type) {
      case "pr_opened":
        return <Badge className="bg-blue-500">PR Opened</Badge>;
      case "pr_merged":
        return <Badge className="bg-green-500">PR Merged</Badge>;
      case "pr_closed":
        return <Badge variant="destructive">PR Closed</Badge>;
      case "commit_pushed":
        return <Badge variant="secondary">Commit</Badge>;
      case "sync_completed":
        return <Badge variant="outline">Sync</Badge>;
      case "ai_review":
        return <Badge className="bg-cyan-500">AI Review</Badge>;
      default:
        return <Badge variant="secondary">Activity</Badge>;
    }
  };

  return (
    <Card className="h-[500px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Activity Feed</CardTitle>
          <Badge variant="outline" className="text-xs">
            <span className="mr-1 h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Live
          </Badge>
        </div>
        <div className="mt-2 flex gap-2">
          {["all", "pr", "commit", "sync"].map((f) => (
            <Badge
              key={f}
              variant={filter === f ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => setFilter(f)}
            >
              {f}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[380px] pr-2">
          <div className="space-y-3">
            {filteredActivities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No recent activity
              </p>
            ) : (
              filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-lg p-2 transition hover:bg-muted"
                >
                  {getIcon(activity.type)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {getBadge(activity.type)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      by {activity.author}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function mapEventType(event?: string, action?: string): ActivityType {
  if (event === "pull_request") {
    if (action === "closed") return "pr_closed";
    if (action === "merged") return "pr_merged";
    return "pr_opened";
  }
  if (event === "push") return "commit_pushed";
  if (event === "sync") return "sync_completed";
  return "pr_opened";
}

function formatMessage(data: ActivityPayload): string {
  if (data.data?.prTitle) return data.data.prTitle;
  if (data.message) return data.message;
  return "New activity";
}
