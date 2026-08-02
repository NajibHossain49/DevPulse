import { Injectable, Logger } from "@nestjs/common";
import { Gitlab } from "@gitbeaker/rest";
import {
  GitProvider,
  NormalizedCommit,
  NormalizedFile,
  NormalizedPullRequest,
  NormalizedReview,
  PullRequestState,
} from "../github/git-provider.interface";

@Injectable()
export class GitlabProvider implements GitProvider {
  private readonly logger = new Logger(GitlabProvider.name);
  private readonly gitlab: InstanceType<typeof Gitlab> | null;

  constructor() {
    const token = process.env.GITLAB_TOKEN;
    this.gitlab = token
      ? new Gitlab({ token, host: process.env.GITLAB_HOST || "https://gitlab.com" })
      : null;
  }

  private client(): InstanceType<typeof Gitlab> {
    if (!this.gitlab) {
      throw new Error(
        "GitLab is not configured. Set GITLAB_TOKEN in the API environment.",
      );
    }
    return this.gitlab;
  }

  async validateRepo(repo: string): Promise<boolean> {
    if (!this.gitlab) return false;
    try {
      await this.client().Projects.show(repo);
      return true;
    } catch (error) {
      this.logger.warn(
        `GitLab repo validation failed for "${repo}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  async getPullRequests(
    repo: string,
    state: PullRequestState = "all",
    page = 1,
  ): Promise<NormalizedPullRequest[]> {
    const mrs = await this.client().MergeRequests.all({
      projectId: repo,
      state: state === "all" ? undefined : state === "closed" ? "closed" : "opened",
      perPage: 100,
      page,
    });

    return (mrs as any[]).map((mr) => ({
      id: Number(mr.id),
      number: Number(mr.iid),
      title: mr.title ?? "",
      body: mr.description ?? null,
      state: mr.state === "merged" ? "merged" : mr.state === "opened" ? "open" : "closed",
      merged_at: mr.merged_at ?? null,
      closed_at: mr.closed_at ?? null,
      created_at: mr.created_at,
      user: {
        login: mr.author?.username ?? "unknown",
        avatar_url: mr.author?.avatar_url ?? null,
      },
    }));
  }

  async getPullRequestReviews(
    repo: string,
    pullNumber: number,
  ): Promise<NormalizedReview[]> {
    const notes = await this.client().MergeRequestNotes.all(repo, pullNumber, {
      perPage: 100,
    });
    return (notes as any[])
      .filter((n) => !n.system)
      .map((n) => ({ submitted_at: n.created_at ?? null }));
  }

  async getPullRequestFiles(
    repo: string,
    pullNumber: number,
  ): Promise<NormalizedFile[]> {
    const changes = (await this.client().MergeRequests.showChanges(
      repo,
      pullNumber,
    )) as { changes?: any[] };

    return (
      changes.changes?.map((c) => ({
        filename: c.new_path || c.old_path || "unknown",
        patch: c.diff ?? null,
        additions: c.additions || 0,
        deletions: c.deletions || 0,
      })) || []
    );
  }

  async getCommits(
    repo: string,
    since?: string,
    page = 1,
  ): Promise<NormalizedCommit[]> {
    const commits = await this.client().Commits.all(repo, {
      perPage: 100,
      page,
      ...(since ? { since } : {}),
    });

    return (commits as any[]).map((c) => ({
      sha: c.id,
      commit: {
        message: c.message ?? "",
        author: {
          name: c.author_name ?? null,
          date: c.created_at ?? c.committed_date ?? null,
        },
      },
      author: {
        login: c.author_name || c.author_email || "unknown",
        avatar_url: null,
      },
    }));
  }

  async getPullRequestDiff(repo: string, pullNumber: number): Promise<string> {
    const files = await this.getPullRequestFiles(repo, pullNumber);
    return files
      .map((f) => `File: ${f.filename}\n${f.patch || ""}`)
      .join("\n\n");
  }
}
