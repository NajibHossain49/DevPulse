"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { apiPostData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StandupGenerator({ projectId }: { projectId: string }) {
  const { data: session } = authClient.useSession();
  const [standup, setStandup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    const userEmail = session?.user?.email;
    if (!userEmail) {
      toast.error("Could not determine your account email.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiPostData<{ standup: string }>("/ai/standup", {
        projectId,
        userEmail,
        days: 1,
      });
      setStandup(data.standup);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate standup");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!standup) return;
    await navigator.clipboard.writeText(standup);
    toast.success("Copied!");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Daily Standup
          </CardTitle>
          <CardDescription>
            Auto-generate your standup from recent activity.
          </CardDescription>
        </div>
        <Button size="sm" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Generate
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : standup ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
              {standup}
            </div>
            <Button size="sm" variant="ghost" onClick={copy}>
              <Copy />
              Copy to clipboard
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click generate to create today&apos;s standup update.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
