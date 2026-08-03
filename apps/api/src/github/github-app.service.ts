import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { Octokit } from "@octokit/rest";
import { AiService, PrAnalysis } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Posts automated AI code reviews on GitHub pull requests.
 *
 * If GitHub App credentials (GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY) and an
 * installation id are available, an installation-scoped token is used.
 * Otherwise we fall back to the personal access token (GITHUB_PAT) so the
 * feature works out of the box for repos that token can access.
 */
@Injectable()
export class GithubAppService {
  private readonly logger = new Logger(GithubAppService.name);

  constructor(
    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  async handlePullRequestOpened(payload: any): Promise<void> {
    try {
      const repository = payload?.repository;
      const pullRequest = payload?.pull_request;
      if (!repository?.full_name || !pullRequest?.number) return;

      const repo: string = repository.full_name;
      const prNumber: number = pullRequest.number;
      const installationId: number | undefined = payload?.installation?.id;

      const files = await this.getPullRequestFiles(
        repo,
        prNumber,
        installationId,
      );
      const diff = files
        .map((f) => `File: ${f.filename}\n${f.patch || ""}`)
        .join("\n\n");

      const analysis = await this.aiService.analyzePullRequest(
        diff,
        pullRequest.title ?? "",
        pullRequest.body ?? null,
      );

      await this.postReviewComment(repo, prNumber, analysis, installationId);

      await this.prisma.pullRequest.updateMany({
        where: { githubId: BigInt(pullRequest.id) },
        data: {
          aiSummary: analysis.summary,
          aiQualityScore: analysis.score,
        },
      });
    } catch (error) {
      this.logger.error(
        `Auto-review failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async getPullRequestFiles(
    repo: string,
    prNumber: number,
    installationId?: number,
  ) {
    const [owner, repoName] = repo.split("/");
    const octokit = await this.getOctokit(installationId);
    const { data } = await octokit.pulls.listFiles({
      owner,
      repo: repoName,
      pull_number: prNumber,
    });
    return data;
  }

  private async postReviewComment(
    repo: string,
    prNumber: number,
    analysis: PrAnalysis,
    installationId?: number,
  ): Promise<void> {
    const [owner, repoName] = repo.split("/");
    const octokit = await this.getOctokit(installationId);

    const scoreEmoji =
      analysis.score >= 80 ? "🟢" : analysis.score >= 60 ? "🟡" : "🔴";
    const suggestions =
      analysis.suggestions.length > 0
        ? analysis.suggestions
            .map((s, i) => `${i + 1}. ${s}`)
            .join("\n")
        : "_No specific suggestions._";

    const body = `## ${scoreEmoji} DevPulse AI Review — Score: ${analysis.score}/100

**Summary:**
${analysis.summary}

**Suggestions:**
${suggestions}

---
*This is an automated review by DevPulse. Human review is still recommended.*`;

    await octokit.pulls.createReview({
      owner,
      repo: repoName,
      pull_number: prNumber,
      body,
      event: "COMMENT",
    });
  }

  private async getOctokit(installationId?: number): Promise<Octokit> {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (appId && privateKey && installationId) {
      try {
        const { createAppAuth } = await import("@octokit/auth-app");
        const auth = createAppAuth({ appId, privateKey, installationId });
        const { token } = await auth({ type: "installation" });
        return new Octokit({ auth: token });
      } catch (error) {
        this.logger.warn(
          `GitHub App auth failed, falling back to PAT: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return new Octokit({ auth: process.env.GITHUB_PAT });
  }
}
