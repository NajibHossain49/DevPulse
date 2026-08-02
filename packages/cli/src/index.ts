#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import clipboard from "clipboardy";
import { DevPulseAPI } from "./api.js";
import { formatStandup, formatStats } from "./formatters.js";

const program = new Command();
const api = new DevPulseAPI();

program
  .name("devpulse")
  .description("DevPulse CLI — Developer analytics in your terminal")
  .version("0.1.0");

program
  .command("login")
  .description("Authenticate with DevPulse (paste a Better Auth session token)")
  .action(async () => {
    console.log(
      chalk.gray(
        "Tip: copy the value of the better-auth.session_token cookie from the web app.",
      ),
    );
    const { token } = await inquirer.prompt<{ token: string }>([
      {
        type: "password",
        name: "token",
        message: "Enter your DevPulse session token:",
        mask: "*",
      },
    ]);

    if (!token?.trim()) {
      console.error(chalk.red("Token is required."));
      process.exitCode = 1;
      return;
    }

    api.setToken(token.trim().split(".")[0]);
    console.log(chalk.green("Authenticated successfully!"));
  });

program
  .command("config")
  .description("Set default project / email used by CLI commands")
  .option("-p, --project <id>", "Default project ID")
  .option("-e, --email <email>", "Your account email")
  .action(async (options: { project?: string; email?: string }) => {
    if (!options.project && !options.email) {
      const current = api.getDefaults();
      console.log(chalk.blue("\nCurrent config\n"));
      console.log(`  project: ${current.projectId || "(unset)"}`);
      console.log(`  email:   ${current.userEmail || "(unset)"}`);
      return;
    }
    api.setDefaults({
      ...(options.project ? { projectId: options.project } : {}),
      ...(options.email ? { userEmail: options.email } : {}),
    });
    console.log(chalk.green("Config saved to ~/.devpulse/config.json"));
  });

program
  .command("standup")
  .description("Generate your daily standup report")
  .option("-d, --days <number>", "Number of days to include", "1")
  .option("-c, --copy", "Copy to clipboard")
  .action(async (options: { days: string; copy?: boolean }) => {
    const spinner = ora("Generating standup...").start();
    try {
      const standup = await api.generateStandup(parseInt(options.days, 10));
      spinner.stop();
      console.log(chalk.blue("\nYour Standup Report\n"));
      console.log(formatStandup(standup));
      if (options.copy) {
        await clipboard.write(standup);
        console.log(chalk.green("\n✓ Copied to clipboard!"));
      }
    } catch (err) {
      spinner.fail(
        chalk.red(err instanceof Error ? err.message : "Failed to generate standup"),
      );
      process.exitCode = 1;
    }
  });

program
  .command("stats")
  .description("Show your personal development stats")
  .option("-p, --project <id>", "Project ID")
  .option("-d, --days <number>", "Number of days", "7")
  .action(async (options: { project?: string; days: string }) => {
    const spinner = ora("Fetching stats...").start();
    try {
      const stats = await api.getPersonalStats(
        options.project,
        parseInt(options.days, 10),
      );
      spinner.stop();
      console.log(chalk.blue(`\nYour Stats (Last ${options.days} days)\n`));
      console.log(formatStats(stats));
    } catch (err) {
      spinner.fail(
        chalk.red(err instanceof Error ? err.message : "Failed to fetch stats"),
      );
      process.exitCode = 1;
    }
  });

program
  .command("pr")
  .description("Pull request helpers")
  .command("analyze <url>")
  .description("Analyze a GitHub PR with AI")
  .action(async (url: string) => {
    const spinner = ora("Analyzing PR...").start();
    try {
      const analysis = await api.analyzePR(url);
      spinner.stop();
      console.log(chalk.blue("\nAI Analysis\n"));
      console.log(chalk.bold(`Score: ${analysis.score}/100`));
      console.log(chalk.gray(`\n${analysis.summary}\n`));
      if (analysis.suggestions?.length) {
        console.log(chalk.yellow("Suggestions:"));
        analysis.suggestions.forEach((s: string, i: number) => {
          console.log(`  ${i + 1}. ${s}`);
        });
      }
    } catch (err) {
      spinner.fail(
        chalk.red(err instanceof Error ? err.message : "Failed to analyze PR"),
      );
      process.exitCode = 1;
    }
  });

program
  .command("sync <projectId>")
  .description("Trigger data sync for a project")
  .action(async (projectId: string) => {
    const spinner = ora("Syncing project data...").start();
    try {
      const result = await api.syncProject(projectId);
      spinner.succeed(
        chalk.green(
          `Synced ${result.prsSynced} PRs and ${result.commitsSynced} commits`,
        ),
      );
    } catch (err) {
      spinner.fail(
        chalk.red(err instanceof Error ? err.message : "Sync failed"),
      );
      process.exitCode = 1;
    }
  });

program
  .command("projects")
  .description("List your projects")
  .action(async () => {
    const spinner = ora("Fetching projects...").start();
    try {
      const projects = await api.getProjects();
      spinner.stop();
      console.log(chalk.blue("\nYour Projects\n"));
      if (projects.length === 0) {
        console.log(chalk.gray("No projects yet."));
        return;
      }
      for (const p of projects) {
        console.log(`${chalk.bold(p.name)} ${chalk.gray(p.githubRepo)}`);
        console.log(`  ${chalk.gray("id:")} ${p.id}`);
        console.log(`  ${chalk.gray("team:")} ${p.teamName}`);
        console.log(
          `  ${chalk.gray("Last synced:")} ${
            p.lastSyncedAt
              ? new Date(p.lastSyncedAt).toLocaleDateString()
              : "Never"
          }`,
        );
        console.log();
      }
    } catch (err) {
      spinner.fail(
        chalk.red(err instanceof Error ? err.message : "Failed to fetch projects"),
      );
      process.exitCode = 1;
    }
  });

program.parse();
