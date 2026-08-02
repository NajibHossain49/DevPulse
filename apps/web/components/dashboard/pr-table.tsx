"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Sparkles,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { apiGetData, apiPostData } from "@/lib/api";
import type { TimelinePr, PrAnalysis } from "@/lib/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AiAnalysisModal } from "./ai-analysis-modal";

type SortColumn = "title" | "author" | "state" | "createdAt" | "reviewTime" | "aiQualityScore";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 15;

function formatReviewTime(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function StateBadge({ state }: { state: string }) {
  const styles: Record<string, string> = {
    open: "bg-blue-500/15 text-blue-500",
    merged: "bg-green-500/15 text-green-500",
    closed: "bg-red-500/15 text-red-500",
  };
  return (
    <Badge className={cn("capitalize", styles[state] ?? "bg-muted text-muted-foreground")}>
      {state}
    </Badge>
  );
}

function qualityColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score > 70) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  return "text-red-500";
}

export function PrTable({ projectId, limit }: { projectId: string; limit?: number }) {
  const [prs, setPrs] = useState<TimelinePr[] | null>(null);
  const [stateFilter, setStateFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [modalPr, setModalPr] = useState<TimelinePr | null>(null);

  const load = useCallback(() => {
    apiGetData<TimelinePr[]>(`/analytics/timeline?projectId=${projectId}`)
      .then(setPrs)
      .catch(() => setPrs([]));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const authors = useMemo(() => {
    if (!prs) return [];
    return Array.from(new Set(prs.map((p) => p.author))).sort();
  }, [prs]);

  const filtered = useMemo(() => {
    if (!prs) return [];
    const rows = prs.filter((p) => {
      if (stateFilter !== "all" && p.state !== stateFilter) return false;
      if (authorFilter !== "all" && p.author !== authorFilter) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    rows.sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      const av = a[sortColumn];
      const bv = b[sortColumn];
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });

    return rows;
  }, [prs, stateFilter, authorFilter, search, sortColumn, sortDirection]);

  const capped = limit ? filtered.slice(0, limit) : filtered.slice(0, visible);

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const SortHeader = ({ column, label, className }: { column: SortColumn; label: string; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {sortColumn === column ? (
          sortDirection === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-50" />
        )}
      </button>
    </TableHead>
  );

  const analyze = async (pr: TimelinePr) => {
    setAnalyzing(pr.id);
    try {
      const result = await apiPostData<PrAnalysis>("/ai/analyze", {
        projectId,
        prId: pr.id,
      });
      setPrs((prev) =>
        prev
          ? prev.map((p) =>
              p.id === pr.id ? { ...p, aiQualityScore: result.score } : p,
            )
          : prev,
      );
      toast.success("PR analyzed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(null);
    }
  };

  if (prs === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!limit && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search pull requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={stateFilter} onValueChange={(v) => setStateFilter(v as string)}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="merged">Merged</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={authorFilter} onValueChange={(v) => setAuthorFilter(v as string)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Author" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All authors</SelectItem>
              {authors.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader column="title" label="Title" />
              <SortHeader column="author" label="Author" />
              <SortHeader column="state" label="Status" />
              <SortHeader column="createdAt" label="Created" />
              <TableHead>Merged</TableHead>
              <SortHeader column="reviewTime" label="Review" />
              <SortHeader column="aiQualityScore" label="Quality" />
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {capped.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No pull requests found.
                </TableCell>
              </TableRow>
            ) : (
              capped.map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell className="max-w-[280px]">
                    <span className="block truncate font-medium" title={pr.title}>
                      {pr.title}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarImage
                          src={`https://github.com/${pr.author}.png`}
                          alt={pr.author}
                        />
                        <AvatarFallback>
                          {pr.author.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-muted-foreground">{pr.author}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StateBadge state={pr.state} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(pr.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pr.mergedAt ? format(new Date(pr.mergedAt), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatReviewTime(pr.reviewTime)}
                  </TableCell>
                  <TableCell>
                    <span className={cn("font-semibold tabular-nums", qualityColor(pr.aiQualityScore))}>
                      {pr.aiQualityScore ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {pr.aiQualityScore === null ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => analyze(pr)}
                        disabled={analyzing === pr.id}
                      >
                        {analyzing === pr.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Sparkles />
                        )}
                        Analyze
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setModalPr(pr)}>
                        <Sparkles />
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!limit && capped.length < filtered.length && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Load more
          </Button>
        </div>
      )}

      <AiAnalysisModal
        projectId={projectId}
        pr={modalPr}
        open={modalPr !== null}
        onClose={() => setModalPr(null)}
      />
    </div>
  );
}
