import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  loading?: boolean;
  trend?: number;
  iconClassName?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  loading = false,
  trend,
  iconClassName,
}: MetricCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-9 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-28" />
        </CardContent>
      </Card>
    );
  }

  const hasTrend = typeof trend === "number";
  const positive = (trend ?? 0) >= 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5",
              iconClassName,
            )}
          >
            <Icon />
          </div>
        </div>

        <div className="text-3xl font-bold tracking-tight">{value}</div>

        <div className="flex items-center gap-2">
          {hasTrend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                positive ? "text-green-500" : "text-red-500",
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {Math.abs(trend as number)}%
            </span>
          )}
          {description && (
            <span className="text-sm text-muted-foreground">{description}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
