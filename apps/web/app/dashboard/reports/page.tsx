"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGetData, apiPostData } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FileText, Mail, GitPullRequest, GitMerge, Clock, GitCommit } from "lucide-react";

const TEAM_STORAGE_KEY = "devpulse.currentTeamId";
const PERIODS = ["7d", "30d"] as const;
type Period = (typeof PERIODS)[number];

interface TeamSummary {
  id: string;
  name: string;
}

interface ProjectSummary {
  id: string;
  name: string;
}

interface Contributor {
  author: string;
  prsOpened: number;
  commitCount: number;
}

interface ReportData {
  period: string;
  generatedAt: string;
  metrics: {
    totalPRs: number;
    mergedPRs: number;
    avgReviewTime: number | null;
    mergeRate: number | null;
    commitsCount: number;
  };
  contributors: Contributor[];
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("7d");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem(TEAM_STORAGE_KEY)
            : null;
        const teams = await apiGetData<TeamSummary[]>("/teams");
        const teamId =
          teams.find((t) => t.id === stored)?.id ?? teams[0]?.id ?? null;
        if (!teamId) return;
        const list = await apiGetData<ProjectSummary[]>(
          `/projects?teamId=${teamId}`,
        );
        setProjects(list);
        if (list[0]) setProjectId(list[0].id);
      } catch {
        toast.error("Failed to load projects");
      } finally {
        setLoadingProjects(false);
      }
    })();
  }, []);

  const fetchReport = useCallback(async () => {
    if (!projectId) return;
    setLoadingReport(true);
    try {
      const data = await apiGetData<ReportData>(
        `/reports?projectId=${projectId}&period=${period}`,
      );
      setReport(data);
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setLoadingReport(false);
    }
  }, [projectId, period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  async function emailReport() {
    if (!projectId) return;
    setSending(true);
    try {
      const { sent } = await apiPostData<{ sent: boolean }>(
        `/reports/send?projectId=${projectId}`,
        {},
      );
      if (sent) toast.success("Report emailed to you");
      else
        toast.message(
          "Email not configured — set RESEND_API_KEY on the API to enable delivery.",
        );
    } catch {
      toast.error("Failed to send report");
    } finally {
      setSending(false);
    }
  }

  const selectedName =
    projects.find((p) => p.id === projectId)?.name ?? "Select a project";

  const cards = report
    ? [
        {
          label: "Total PRs",
          value: report.metrics.totalPRs,
          icon: GitPullRequest,
        },
        {
          label: "PRs Merged",
          value: report.metrics.mergedPRs,
          icon: GitMerge,
        },
        {
          label: "Avg Review Time",
          value:
            report.metrics.avgReviewTime !== null
              ? `${report.metrics.avgReviewTime} min`
              : "n/a",
          icon: Clock,
        },
        {
          label: "Commits",
          value: report.metrics.commitsCount,
          icon: GitCommit,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and email engineering summaries
          </p>
        </div>
        <Button onClick={emailReport} disabled={!projectId || sending}>
          <Mail className="mr-2 h-4 w-4" />
          {sending ? "Sending..." : "Email me this report"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-64">
          <Select
            value={projectId ?? ""}
            onValueChange={(v) => setProjectId(v as string)}
            disabled={loadingProjects || projects.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{() => selectedName}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="inline-flex rounded-lg border p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                period === p
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loadingProjects ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Add a project first to generate reports.
          </CardContent>
        </Card>
      ) : loadingReport || !report ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {cards.map((c) => (
              <Card key={c.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {c.label}
                  </CardTitle>
                  <c.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{c.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.contributors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contributor activity in this period.
                </p>
              ) : (
                <div className="space-y-2">
                  {report.contributors.map((c) => (
                    <div
                      key={c.author}
                      className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm"
                    >
                      <span className="font-medium">{c.author}</span>
                      <span className="text-muted-foreground">
                        {c.prsOpened} PRs · {c.commitCount} commits
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Generated {new Date(report.generatedAt).toLocaleString()}. Paid
            teams also receive automated weekly reports every Monday.
          </p>
        </div>
      )}
    </div>
  );
}
