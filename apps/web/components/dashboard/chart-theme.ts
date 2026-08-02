// Shared Recharts tooltip styling that respects the app's dark theme tokens.
// Kept as a plain object (not typed with TooltipProps) so it can be spread into
// any Tooltip regardless of its value/name generic parameters.
export const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--foreground)", fontWeight: 600 },
  itemStyle: { color: "var(--popover-foreground)" },
  cursor: { fill: "var(--muted)", opacity: 0.4 },
};
