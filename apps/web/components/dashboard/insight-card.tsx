import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InsightSeverity } from "@/lib/types";

const SEVERITY_STYLES: Record<InsightSeverity, { border: string; icon: string }> = {
  high: { border: "border-l-red-500", icon: "text-red-500" },
  medium: { border: "border-l-yellow-500", icon: "text-yellow-500" },
  low: { border: "border-l-blue-500", icon: "text-blue-500" },
};

export function InsightCard({
  title,
  description,
  severity,
}: {
  title: string;
  description: string;
  severity: InsightSeverity;
}) {
  const styles = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.low;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border border-l-4 bg-card p-4 transition-colors",
        styles.border,
      )}
    >
      <Lightbulb className={cn("mt-0.5 size-4 shrink-0", styles.icon)} />
      <div className="space-y-1">
        <h4 className="text-sm font-semibold leading-tight">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
