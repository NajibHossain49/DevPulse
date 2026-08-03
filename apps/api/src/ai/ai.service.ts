import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
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

export type SprintStatus = "on_track" | "at_risk" | "off_track";

export interface SprintPrediction {
  probability: number;
  status: SprintStatus;
  riskFactors: string[];
  recommendations: string[];
}

export interface SprintInput {
  velocity: number;
  openPRs: number;
  targetPRs: number;
  avgReviewTime: number | null;
  daysRemaining: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly groq: Groq | null;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    } else {
      this.groq = null;
      this.logger.warn(
        "GROQ_API_KEY is not set — AI endpoints will return 503 until configured",
      );
    }
  }

  private client(): Groq {
    if (!this.groq) {
      throw new ServiceUnavailableException(
        "AI is not configured. Set GROQ_API_KEY on the API host.",
      );
    }
    return this.groq;
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
      const completion = await this.client().chat.completions.create({
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
      const completion = await this.client().chat.completions.create({
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
      const completion = await this.client().chat.completions.create({
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

  async predictSprint(data: SprintInput): Promise<SprintPrediction> {
    const prompt = `As an engineering manager, predict sprint completion:
- Current velocity: ${data.velocity.toFixed(1)} PRs/week
- Open PRs in backlog: ${data.openPRs}
- Sprint target: ${data.targetPRs} PRs
- Avg review time: ${data.avgReviewTime ?? "unknown"} minutes
- Days remaining: ${data.daysRemaining}

Return ONLY JSON:
{
  "probability": number (0-100),
  "status": "on_track" | "at_risk" | "off_track",
  "riskFactors": string[],
  "recommendations": string[]
}`;

    try {
      const completion = await this.client().chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              "You are a sprint planning expert. Be concise and data-driven.",
          },
          { role: "user", content: prompt },
        ],
      });

      const content = completion.choices[0]?.message?.content ?? "";
      const parsed = extractJson<Partial<SprintPrediction>>(content);
      if (parsed && typeof parsed.probability === "number") {
        return {
          probability: clamp(Math.round(parsed.probability), 0, 100),
          status: normalizeSprintStatus(parsed.status),
          riskFactors: Array.isArray(parsed.riskFactors)
            ? parsed.riskFactors.filter(
                (s): s is string => typeof s === "string",
              )
            : [],
          recommendations: Array.isArray(parsed.recommendations)
            ? parsed.recommendations.filter(
                (s): s is string => typeof s === "string",
              )
            : [],
        };
      }
    } catch (error) {
      this.logger.error(`predictSprint failed: ${errMessage(error)}`);
    }

    // Simple heuristic fallback.
    const neededPerDay = data.targetPRs / Math.max(data.daysRemaining, 1);
    const canDeliverPerDay = data.velocity / 7;
    const probability = clamp(
      Math.round(
        (canDeliverPerDay / Math.max(neededPerDay, 0.0001)) * 100,
      ),
      0,
      100,
    );

    return {
      probability,
      status:
        probability >= 80
          ? "on_track"
          : probability >= 50
            ? "at_risk"
            : "off_track",
      riskFactors:
        data.avgReviewTime && data.avgReviewTime > 240
          ? ["High review time"]
          : [],
      recommendations:
        probability < 80
          ? ["Reduce sprint scope", "Add more reviewers"]
          : ["Continue current pace"],
    };
  }
}

function normalizeSprintStatus(value: unknown): SprintStatus {
  return value === "on_track" || value === "at_risk" || value === "off_track"
    ? value
    : "at_risk";
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
