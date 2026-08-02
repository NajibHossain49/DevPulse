import * as vscode from "vscode";
import { DevPulseProvider } from "./treeProvider";
import { DevPulseAPI } from "./api";

export function activate(context: vscode.ExtensionContext) {
  const api = new DevPulseAPI();
  const provider = new DevPulseProvider(api);

  vscode.window.registerTreeDataProvider("devpulse.sidebar", provider);

  context.subscriptions.push(
    vscode.commands.registerCommand("devpulse.standup", async () => {
      const panel = vscode.window.createWebviewPanel(
        "devpulseStandup",
        "DevPulse Standup",
        vscode.ViewColumn.One,
        { enableScripts: true },
      );

      try {
        const standup = await api.generateStandup();
        const escaped = standup
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        panel.webview.html = `
          <!DOCTYPE html>
          <html>
            <body style="font-family: sans-serif; padding: 20px; background: #0d1117; color: #c9d1d9;">
              <h1>Daily Standup</h1>
              <pre style="background: #161b22; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${escaped}</pre>
            </body>
          </html>
        `;
      } catch (err) {
        vscode.window.showErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to generate standup. Check your API key in settings.",
        );
      }
    }),

    vscode.commands.registerCommand("devpulse.stats", async () => {
      try {
        const stats = await api.getPersonalStats();
        const message = `
Your Stats (7 days)
• Commits: ${stats.commits}
• PRs: ${stats.prsOpened} opened, ${stats.prsMerged} merged
• Review Time: ${
          stats.avgReviewTime
            ? Math.round(stats.avgReviewTime) + " min"
            : "N/A"
        }
        `.trim();
        vscode.window.showInformationMessage(message, { modal: true });
      } catch (err) {
        vscode.window.showErrorMessage(
          err instanceof Error ? err.message : "Failed to fetch stats",
        );
      }
    }),

    vscode.commands.registerCommand("devpulse.openDashboard", () => {
      vscode.env.openExternal(vscode.Uri.parse(api.getDashboardUrl()));
    }),

    vscode.commands.registerCommand("devpulse.refresh", () => {
      provider.refresh();
    }),
  );

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = "$(pulse) DevPulse";
  statusBarItem.tooltip = "Click to open DevPulse";
  statusBarItem.command = "devpulse.openDashboard";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

export function deactivate() {}
