import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const API_BASE = process.env.DEVPULSE_API_URL || "http://localhost:3001";
const CONFIG_DIR = join(homedir(), ".devpulse");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  token?: string;
  projectId?: string;
  userEmail?: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export class DevPulseAPI {
  private token: string | null = null;

  constructor() {
    this.token = this.loadConfig().token ?? null;
  }

  setToken(token: string) {
    this.token = token;
    this.saveConfig({ token });
  }

  setDefaults(partial: Partial<Config>) {
    this.saveConfig(partial);
  }

  getDefaults(): Config {
    return this.loadConfig();
  }

  private loadConfig(): Config {
    try {
      if (!existsSync(CONFIG_FILE)) return {};
      return JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as Config;
    } catch {
      return {};
    }
  }

  private saveConfig(partial: Partial<Config>) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    const next = { ...this.loadConfig(), ...partial };
    writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2));
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.token) {
      throw new Error("Not authenticated. Run `devpulse login` first.");
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      let message = `API error: ${res.status}`;
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) message = body.error;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    const json = (await res.json()) as Envelope<T> | T;
    if (json && typeof json === "object" && "success" in json && "data" in json) {
      return (json as Envelope<T>).data;
    }
    return json as T;
  }

  async generateStandup(days: number) {
    const config = this.loadConfig();
    const projectId = config.projectId;
    const userEmail = config.userEmail;
    if (!projectId || !userEmail) {
      throw new Error(
        "Set a default project and email first:\n  devpulse config --project <id> --email you@example.com",
      );
    }

    const data = await this.request<{ standup: string }>("/ai/standup", {
      method: "POST",
      body: JSON.stringify({ projectId, userEmail, days }),
    });
    return data.standup;
  }

  async getPersonalStats(projectId?: string, days = 7) {
    const params = new URLSearchParams();
    const resolved = projectId || this.loadConfig().projectId;
    if (resolved) params.append("projectId", resolved);
    params.append("days", days.toString());
    return this.request<Record<string, number | null>>(
      `/analytics/personal?${params}`,
    );
  }

  async analyzePR(url: string) {
    return this.request<{
      score: number;
      summary: string;
      suggestions: string[];
    }>("/ai/analyze-pr", {
      method: "POST",
      body: JSON.stringify({ prUrl: url }),
    });
  }

  async syncProject(projectId: string) {
    return this.request<{ prsSynced: number; commitsSynced: number }>(
      "/github/sync",
      {
        method: "POST",
        body: JSON.stringify({ projectId }),
      },
    );
  }

  async getProjects() {
    const teams = await this.request<{ id: string; name: string }[]>("/teams");
    const projects: Array<{
      id: string;
      name: string;
      githubRepo: string;
      lastSyncedAt: string | null;
      teamName: string;
    }> = [];

    for (const team of teams) {
      const list = await this.request<
        Array<{
          id: string;
          name: string;
          githubRepo: string;
          lastSyncedAt: string | null;
        }>
      >(`/projects?teamId=${team.id}`);
      for (const p of list) {
        projects.push({ ...p, teamName: team.name });
      }
    }
    return projects;
  }
}
