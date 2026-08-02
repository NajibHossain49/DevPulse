"use client";

import { use } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProjectHeader } from "@/components/projects/project-header";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { AiInsights } from "@/components/dashboard/ai-insights";
import { StandupGenerator } from "@/components/dashboard/standup-generator";
import { PrTable } from "@/components/dashboard/pr-table";
import { PullRequestsPanel } from "@/components/dashboard/pull-requests-panel";
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ProjectHeader projectId={id} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pull-requests">Pull Requests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <MetricsGrid projectId={id} period="30d" />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AiInsights projectId={id} />
            <StandupGenerator projectId={id} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Pull Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <PrTable projectId={id} limit={5} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pull-requests">
          <PullRequestsPanel projectId={id} />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsPanel projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
