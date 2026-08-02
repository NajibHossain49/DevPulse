"use client";

import { use } from "react";
import { ProjectHeader } from "@/components/projects/project-header";
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel";

export default function ProjectAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ProjectHeader projectId={id} backHref={`/dashboard/projects/${id}`} />
      <AnalyticsPanel projectId={id} />
    </div>
  );
}
