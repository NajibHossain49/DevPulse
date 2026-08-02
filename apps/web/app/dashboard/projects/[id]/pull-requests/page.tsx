"use client";

import { use } from "react";
import { ProjectHeader } from "@/components/projects/project-header";
import { PullRequestsPanel } from "@/components/dashboard/pull-requests-panel";

export default function ProjectPullRequestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ProjectHeader projectId={id} backHref={`/dashboard/projects/${id}`} />
      <PullRequestsPanel projectId={id} />
    </div>
  );
}
