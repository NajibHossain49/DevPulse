import { Injectable, Logger } from "@nestjs/common";
import { Octokit } from "@octokit/rest";
import {
  GitProvider,
  NormalizedCommit,
  NormalizedFile,
  NormalizedPullRequest,
  NormalizedReview,
  PullRequestState,
} from "./git-provider.interface";

@Injectable()
export class GithubService implements GitProvider {
  private readonly logger = new Logger(GithubService.name);
  private readonly octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_PAT });
  }

  get client(): Octokit {
    return this.octokit;
  }

  async validateRepo(repo: string): Promise<boolean> {
    const { owner, name } = splitRepo(repo);
    if (!owner || !name) return false;

    try {
      await this.octokit.repos.get({ owner, repo: name });
      return true;
    } catch (error) {
      this.logger.warn(`Repo validation failed for "${repo}": ${errMessage(error)}`);
      return false;
    }
  }

  async getPullRequests(
    repo: string,
    state: PullRequestState = "all",
    page = 1,
  ): Promise<NormalizedPullRequest[]> {
    const { owner, name } = splitRepo(repo);
    const { data } = await this.octokit.pulls.list({
      owner,
      repo: name,
      state,
      per_page: 100,
      page,
      sort: "created",
      direction: "desc",
    });
    return data.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title ?? "",
      body: pr.body ?? null,
      state: pr.merged_at ? "merged" : pr.state,
      merged_at: pr.merged_at ?? null,
      closed_at: pr.closed_at ?? null,
      created_at: pr.created_at,
      user: pr.user
        ? { login: pr.user.login, avatar_url: pr.user.avatar_url ?? null }
        : null,
    }));
  }

  async getPullRequestReviews(
    repo: string,
    pullNumber: number,
  ): Promise<NormalizedReview[]> {
    const { owner, name } = splitRepo(repo);
    const { data } = await this.octokit.pulls.listReviews({
      owner,
      repo: name,
      pull_number: pullNumber,
      per_page: 100,
    });
    return data.map((r) => ({ submitted_at: r.submitted_at ?? null }));
  }

  async getPullRequestFiles(
    repo: string,
    pullNumber: number,
  ): Promise<NormalizedFile[]> {
    const { owner, name } = splitRepo(repo);
    const { data } = await this.octokit.pulls.listFiles({
      owner,
      repo: name,
      pull_number: pullNumber,
      per_page: 100,
    });
    return data.map((f) => ({
      filename: f.filename,
      patch: f.patch ?? null,
      additions: f.additions ?? 0,
      deletions: f.deletions ?? 0,
    }));
  }

  async getCommits(
    repo: string,
    since?: string,
    page = 1,
  ): Promise<NormalizedCommit[]> {
    const { owner, name } = splitRepo(repo);
    const params: {
      owner: string;
      repo: string;
      per_page: number;
      page: number;
      since?: string;
    } = { owner, repo: name, per_page: 100, page };
    if (since) params.since = since;

    const { data } = await this.octokit.repos.listCommits(params);
    return data.map((c) => ({
      sha: c.sha,
      commit: {
        message: c.commit?.message ?? "",
        author: {
          name: c.commit?.author?.name ?? null,
          date: c.commit?.author?.date ?? null,
        },
      },
      author: c.author
        ? { login: c.author.login, avatar_url: c.author.avatar_url ?? null }
        : null,
    }));
  }

  async getPullRequestDiff(repo: string, pullNumber: number): Promise<string> {
    const files = await this.getPullRequestFiles(repo, pullNumber);
    return files
      .map((f) => `File: ${f.filename}\n${f.patch || ""}`)
      .join("\n\n");
  }
}

function splitRepo(repo: string): { owner: string; name: string } {
  const [owner, name] = (repo || "").split("/");
  return { owner, name };
}

function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
