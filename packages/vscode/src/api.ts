import * as vscode from "vscode";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export class DevPulseAPI {
  private getConfig() {
    const config = vscode.workspace.getConfiguration("devpulse");
    return {
      apiKey: config.get<string>("apiKey") || "",
      apiUrl: config.get<string>("apiUrl") || "http://localhost:3001",
      projectId: config.get<string>("projectId") || "",
      userEmail: config.get<string>("userEmail") || "",
      dashboardUrl:
        config.get<string>("dashboardUrl") || "http://localhost:3000/dashboard",
    };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const { apiKey, apiUrl } = this.getConfig();
    if (!apiKey) {
      throw new Error("Set devpulse.apiKey in VS Code settings");
    }

    const res = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.split(".")[0]}`,
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const json = (await res.json()) as Envelope<T> | T;
    if (json && typeof json === "object" && "success" in json && "data" in json) {
      return (json as Envelope<T>).data;
    }
    return json as T;
  }

  async generateStandup() {
    const { projectId, userEmail } = this.getConfig();
    if (!projectId || !userEmail) {
      throw new Error(
        "Set devpulse.projectId and devpulse.userEmail in VS Code settings",
      );
    }
    const data = await this.request<{ standup: string }>("/ai/standup", {
      method: "POST",
      body: JSON.stringify({ projectId, userEmail, days: 1 }),
    });
    return data.standup;
  }

  async getPersonalStats() {
    const { projectId } = this.getConfig();
    const params = new URLSearchParams({ days: "7" });
    if (projectId) params.set("projectId", projectId);
    return this.request<{
      commits: number;
      prsOpened: number;
      prsMerged: number;
      avgReviewTime: number | null;
    }>(`/analytics/personal?${params}`);
  }

  getDashboardUrl() {
    return this.getConfig().dashboardUrl;
  }
}
