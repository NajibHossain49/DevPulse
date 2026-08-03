import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GithubService } from "./github.service";
import { GitlabProvider } from "../gitlab/gitlab.provider";
import {
  GitProvider,
  NormalizedCommit,
  NormalizedPullRequest,
} from "./git-provider.interface";

const MAX_PAGES = 10;
const PER_PAGE = 100;
const COMMIT_WINDOW_DAYS = 90;

export interface SyncSummary {
  prsSynced: number;
  commitsSynced: number;
  errors: string[];
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly github: GithubService,
    private readonly gitlab: GitlabProvider,
    private readonly prisma: PrismaService,
  ) {}

  private getProvider(type: string | null | undefined): GitProvider {
    return type === "gitlab" ? this.gitlab : this.github;
  }

  async syncProject(projectId: string): Promise<SyncSummary> {
    const summary: SyncSummary = {
      prsSynced: 0,
      commitsSynced: 0,
      errors: [],
    };

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      summary.errors.push("Project not found");
      return summary;
    }

    const repo = project.githubRepo;
    const provider = this.getProvider(project.provider);

    await this.syncPullRequests(project.id, repo, provider, summary);
    await this.syncCommits(project.id, repo, provider, summary);

    await this.prisma.project.update({
      where: { id: project.id },
      data: { lastSyncedAt: new Date() },
    });

    return summary;
  }

  private async syncPullRequests(
    projectId: string,
    repo: string,
    provider: GitProvider,
    summary: SyncSummary,
  ): Promise<void> {
    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const prs = await provider.getPullRequests(repo, "all", page);
        if (prs.length === 0) break;

        for (const pr of prs) {
          try {
            await this.upsertPullRequest(projectId, repo, provider, pr);
            summary.prsSynced++;
          } catch (error) {
            summary.errors.push(`PR #${pr.number}: ${errMessage(error)}`);
          }
        }

        if (prs.length < PER_PAGE) break;
      }
    } catch (error) {
      summary.errors.push(`PR fetch failed: ${errMessage(error)}`);
    }
  }

  private async upsertPullRequest(
    projectId: string,
    repo: string,
    provider: GitProvider,
    pr: NormalizedPullRequest,
  ): Promise<void> {
    const reviews = await provider.getPullRequestReviews(repo, pr.number);
    const firstReviewAt = earliestReviewDate(reviews);

    const files = await provider.getPullRequestFiles(repo, pr.number);
    const additions = sumBy(files, (f) => f.additions ?? 0);
    const deletions = sumBy(files, (f) => f.deletions ?? 0);
    const changedFiles = files.length;

    const createdAt = new Date(pr.created_at);
    const reviewTime = firstReviewAt
      ? Math.round((firstReviewAt.getTime() - createdAt.getTime()) / 60000)
      : null;

    const data = {
      number: pr.number,
      title: pr.title ?? "",
      body: pr.body ?? null,
      state: pr.merged_at ? "merged" : pr.state,
      author: pr.user?.login ?? "unknown",
      authorAvatar: pr.user?.avatar_url ?? null,
      projectId,
      createdAt,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      additions,
      deletions,
      changedFiles,
      reviewTime,
      firstReviewAt,
    };

    await this.prisma.pullRequest.upsert({
      where: { githubId: BigInt(pr.id) },
      create: { githubId: BigInt(pr.id), ...data },
      update: data,
    });
  }

  private async syncCommits(
    projectId: string,
    repo: string,
    provider: GitProvider,
    summary: SyncSummary,
  ): Promise<void> {
    const since = new Date(
      Date.now() - COMMIT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const commits = await provider.getCommits(repo, since, page);
        if (commits.length === 0) break;

        for (const commit of commits) {
          try {
            await this.upsertCommit(projectId, commit);
            summary.commitsSynced++;
          } catch (error) {
            summary.errors.push(
              `Commit ${String(commit.sha).slice(0, 7)}: ${errMessage(error)}`,
            );
          }
        }

        if (commits.length < PER_PAGE) break;
      }
    } catch (error) {
      summary.errors.push(`Commit fetch failed: ${errMessage(error)}`);
    }
  }

  private async upsertCommit(
    projectId: string,
    commit: NormalizedCommit,
  ): Promise<void> {
    const data = {
      message: commit.commit?.message ?? "",
      author: commit.author?.login ?? commit.commit?.author?.name ?? "unknown",
      authorAvatar: commit.author?.avatar_url ?? null,
      projectId,
      createdAt: commit.commit?.author?.date
        ? new Date(commit.commit.author.date)
        : new Date(),
    };

    await this.prisma.commit.upsert({
      where: { sha: commit.sha },
      create: { sha: commit.sha, ...data },
      update: data,
    });
  }
}

function earliestReviewDate(
  reviews: { submitted_at: string | null }[],
): Date | null {
  const dates = reviews
    .filter((r) => r.submitted_at)
    .map((r) => new Date(r.submitted_at as string))
    .sort((a, b) => a.getTime() - b.getTime());
  return dates[0] ?? null;
}

function sumBy<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0);
}

function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
