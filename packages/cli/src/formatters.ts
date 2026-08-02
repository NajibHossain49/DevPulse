import chalk from "chalk";

export function formatStandup(standup: string): string {
  return standup
    .split("\n")
    .map((line) => {
      if (line.startsWith("- ") || line.startsWith("• ")) return chalk.white(line);
      return line;
    })
    .join("\n");
}

export function formatStats(stats: Record<string, number | null | undefined>): string {
  return `
${chalk.bold("Commits:")} ${stats.commits || 0}
${chalk.bold("PRs Opened:")} ${stats.prsOpened || 0}
${chalk.bold("PRs Merged:")} ${stats.prsMerged || 0}
${chalk.bold("Avg Review Time:")} ${
    stats.avgReviewTime ? `${Math.round(Number(stats.avgReviewTime))} min` : "N/A"
  }
${chalk.bold("Lines Added:")} ${stats.linesAdded || 0}
${chalk.bold("Lines Deleted:")} ${stats.linesDeleted || 0}
  `.trim();
}

export function formatPRTable(
  prs: Array<{ title: string; state: string; aiQualityScore?: number | null }>,
): string {
  const header = `${chalk.bold("Title".padEnd(40))} ${chalk.bold("Status".padEnd(10))} ${chalk.bold("Score")}`;
  const rows = prs.map(
    (pr) =>
      `${pr.title.slice(0, 37).padEnd(40)} ${pr.state.padEnd(10)} ${pr.aiQualityScore ?? "N/A"}`,
  );
  return [header, ...rows].join("\n");
}
