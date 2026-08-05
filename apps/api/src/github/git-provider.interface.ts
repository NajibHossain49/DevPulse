export type PullRequestState = "all" | "open" | "closed";

/**
 * Normalized PR shape used by SyncService (GitHub-compatible field names).
 */
export interface NormalizedPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  merged_at: string | null;
  closed_at: string | null;
  created_at: string;
  user: { login: string; avatar_url: string | null } | null;
}

export interface NormalizedReview {
  submitted_at: string | null;
}

export interface NormalizedFile {
  filename: string;
  patch?: string | null;
  additions?: number;
  deletions?: number;
}

export interface NormalizedCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string | null; date: string | null } | null;
  };
  author: { login: string; avatar_url: string | null } | null;
}

export interface GitProvider {
  validateRepo(repo: string): Promise<boolean>;
  getPullRequests(
    repo: string,
    state?: PullRequestState,
    page?: number,
  ): Promise<NormalizedPullRequest[]>;
  getPullRequestReviews(
    repo: string,
    pullNumber: number,
  ): Promise<NormalizedReview[]>;
  getPullRequestFiles(
    repo: string,
    pullNumber: number,
  ): Promise<NormalizedFile[]>;
  getCommits(
    repo: string,
    since?: string,
    page?: number,
  ): Promise<NormalizedCommit[]>;
  getPullRequestDiff(repo: string, pullNumber: number): Promise<string>;
}

export const GIT_PROVIDER = "GIT_PROVIDER";

export type GitProviderMap = {
  github: GitProvider;
};
