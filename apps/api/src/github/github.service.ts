import { Injectable, Logger } from "@nestjs/common";
import { Octokit } from "@octokit/rest";

type PullRequestState = "all" | "open" | "closed";

@Injectable()
export class GithubService {
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
  ) {
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
    return data;
  }

  async getPullRequestReviews(repo: string, pullNumber: number) {
    const { owner, name } = splitRepo(repo);
    const { data } = await this.octokit.pulls.listReviews({
      owner,
      repo: name,
      pull_number: pullNumber,
      per_page: 100,
    });
    return data;
  }

  async getPullRequestFiles(repo: string, pullNumber: number) {
    const { owner, name } = splitRepo(repo);
    const { data } = await this.octokit.pulls.listFiles({
      owner,
      repo: name,
      pull_number: pullNumber,
      per_page: 100,
    });
    return data;
  }

  async getCommits(repo: string, since?: string, page = 1) {
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
    return data;
  }
}

function splitRepo(repo: string): { owner: string; name: string } {
  const [owner, name] = (repo || "").split("/");
  return { owner, name };
}

function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
