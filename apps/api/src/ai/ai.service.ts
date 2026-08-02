import { Injectable, Logger } from "@nestjs/common";
import Groq from "groq-sdk";
import type { ProjectMetrics } from "../analytics/analytics.service";

// NOTE: The spec requested "llama-4-scout-17b-16e-instruct", which is not
// available on the configured Groq key. Defaulting to an available model and
// allowing an override via GROQ_MODEL so this works out of the box.
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_DIFF_LENGTH = 8000;

export interface PrAnalysis {
  score: number;
  summary: string;
  suggestions: string[];
}

export type InsightSeverity = "high" | "medium" | "low";

export interface Insight {
  title: string;
  description: string;
  severity: InsightSeverity;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly groq: Groq;

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async analyzePullRequest(
    diff: string,
    title: string,
    description?: string | null,
  ): Promise<PrAnalysis> {
    const truncatedDiff =
      diff.length > MAX_DIFF_LENGTH
        ? `${diff.slice(0, MAX_DIFF_LENGTH)}...[truncated]`
        : diff;

    const systemPrompt =
      "You are a senior software engineer reviewing code. Analyze the provided PR diff and return ONLY a JSON object with no markdown formatting. Structure: { score: number (0-100), summary: string (2-3 sentences), suggestions: string[] (max 3) }. Consider: code readability, best practices, potential bugs, security issues, test coverage.";

    const userPrompt = `Title: ${title}\n\nDescription: ${description ?? "N/A"}\n\nDiff:\n${truncatedDiff}`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = completion.choices[0]?.message?.content ?? "";
      const parsed = extractJson<Partial<PrAnalysis>>(content);
      if (!parsed || typeof parsed.score !== "number") {
        throw new Error("Failed to parse AI response");
      }

      const score = clamp(Math.round(parsed.score), 0, 100);
      const summary =
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "No summary provided.";
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
            .filter((s): s is string => typeof s === "string")
            .slice(0, 3)
        : [];

      return { score, summary, suggestions };
    } catch (error) {
      this.logger.error(`analyzePullRequest failed: ${errMessage(error)}`);
      return {
        score: 50,
        summary: "AI analysis temporarily unavailable",
        suggestions: [],
      };
    }
  }

  async generateStandup(
    commits: { message: string; createdAt: Date }[],
    prs: { title: string; state: string; createdAt: Date }[],
    userName: string,
  ): Promise<string> {
    const systemPrompt =
      "You are a helpful engineering assistant. Generate a concise standup update in 3 bullet points: What I worked on (past tense, from commits and merged PRs), What I'm working on today (inferred from open PRs), Any blockers (if none, say No blockers). Keep under 100 words. Professional tone.";

    const commitLines = commits.length
      ? commits.map((c) => `- ${firstLine(c.message)}`).join("\n")
      : "- (no commits)";
    const prLines = prs.length
      ? prs.map((p) => `- [${p.state}] ${p.title}`).join("\n")
      : "- (no pull requests)";

    const userPrompt = `Engineer: ${userName}\n\nRecent commits:\n${commitLines}\n\nRecent pull requests:\n${prLines}`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 300,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      return (
        completion.choices[0]?.message?.content?.trim() ||
        "Standup update unavailable."
      );
    } catch (error) {
      this.logger.error(`generateStandup failed: ${errMessage(error)}`);
      return "Standup update temporarily unavailable.";
    }
  }

  async generateInsights(metrics: ProjectMetrics): Promise<Insight[]> {
    const systemPrompt =
      'You are an engineering manager analyzing team metrics. Given development metrics, provide exactly 3 actionable insights. Return ONLY a JSON array: [{ title: string (5-8 words), description: string (1-2 sentences with specific recommendation), severity: "high" | "medium" | "low" }]. Be specific, data-driven, and actionable.';

    const userPrompt = [
      `totalPRs: ${metrics.totalPRs}`,
      `mergedPRs: ${metrics.mergedPRs}`,
      `mergeRate: ${metrics.mergeRate ?? "N/A"}%`,
      `avgReviewTime: ${metrics.avgReviewTime ?? "N/A"} minutes`,
      `avgPRSize: ${metrics.avgPRSize ?? "N/A"} lines`,
      `avgQualityScore: ${metrics.avgQualityScore ?? "N/A"}`,
      `commitsCount: ${metrics.commitsCount}`,
      `activeContributors: ${metrics.activeContributors}`,
    ].join("\n");

    try {
      const completion = await this.groq.chat.completions.create({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = completion.choices[0]?.message?.content ?? "";
      const parsed = extractJson<any[]>(content);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Failed to parse AI insights");
      }

      return parsed.slice(0, 3).map((item) => ({
        title:
          typeof item?.title === "string" ? item.title : "Untitled insight",
        description:
          typeof item?.description === "string" ? item.description : "",
        severity: normalizeSeverity(item?.severity),
      }));
    } catch (error) {
      this.logger.error(`generateInsights failed: ${errMessage(error)}`);
      return [
        {
          title: "Insights unavailable",
          description: "Please try again later.",
          severity: "low",
        },
      ];
    }
  }
}

function extractJson<T>(content: string): T | null {
  if (!content) return null;
  let text = content.trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  try {
    return JSON.parse(text) as T;
  } catch {
    // fall through to bracket extraction
  }

  const objStart = text.indexOf("{");
  const arrStart = text.indexOf("[");
  let start = -1;
  let end = -1;

  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
    start = arrStart;
    end = text.lastIndexOf("]");
  } else if (objStart !== -1) {
    start = objStart;
    end = text.lastIndexOf("}");
  }

  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeSeverity(value: unknown): InsightSeverity {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "low";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function firstLine(text: string): string {
  return (text || "").split("\n")[0].trim();
}

function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
