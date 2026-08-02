"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiGetData, apiPostData } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ProjectDetail {
  id: string;
  name: string;
  githubRepo: string;
  autoReview: boolean;
}

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [autoReview, setAutoReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiGetData<ProjectDetail>(`/projects/${id}`)
      .then((project) => {
        if (active) setAutoReview(project.autoReview);
      })
      .catch(() => toast.error("Failed to load project settings"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function toggleAutoReview(enabled: boolean) {
    setSaving(true);
    const previous = autoReview;
    setAutoReview(enabled);
    try {
      await apiPostData(`/projects/${id}/settings`, { autoReview: enabled });
      toast.success(
        enabled ? "Auto AI review enabled" : "Auto AI review disabled",
      );
    } catch {
      setAutoReview(previous);
      toast.error("Failed to update setting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to project
        </Link>
        <h1 className="text-3xl font-bold">Project Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Code Review</CardTitle>
          <CardDescription>
            Automatically analyze new pull requests with AI
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-review">Enable Auto Review</Label>
            <p className="text-sm text-muted-foreground">
              AI will post a review comment on every new PR
            </p>
          </div>
          {loading ? (
            <Skeleton className="h-6 w-11 rounded-full" />
          ) : (
            <Switch
              id="auto-review"
              checked={autoReview}
              disabled={saving}
              onCheckedChange={toggleAutoReview}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
