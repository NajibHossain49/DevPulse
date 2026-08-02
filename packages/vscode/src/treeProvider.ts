import * as vscode from "vscode";
import { DevPulseAPI } from "./api";

export class DevPulseProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private api: DevPulseAPI) {}

  refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    const standupItem = new vscode.TreeItem(
      "Generate Standup",
      vscode.TreeItemCollapsibleState.None,
    );
    standupItem.command = {
      command: "devpulse.standup",
      title: "Generate Standup",
    };

    const statsItem = new vscode.TreeItem(
      "My Stats",
      vscode.TreeItemCollapsibleState.None,
    );
    statsItem.command = { command: "devpulse.stats", title: "Show Stats" };

    const dashboardItem = new vscode.TreeItem(
      "Open Dashboard",
      vscode.TreeItemCollapsibleState.None,
    );
    dashboardItem.command = {
      command: "devpulse.openDashboard",
      title: "Open Dashboard",
    };

    return [standupItem, statsItem, dashboardItem];
  }
}
