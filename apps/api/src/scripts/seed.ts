/**
 * DevPulse seed — demo users + real GitHub repositories synced via API.
 *
 * Repos: zod, zustand, query, drizzle-orm, ui, create-t3-app
 *
 * Login (all users):
 *   email: <local>@devpulse.demo
 *   password: DevPulse123!
 *
 * Roles: owner | admin | member | viewer
 *
 * Requires GITHUB_PAT in apps/api/.env
 */
import { randomBytes, scrypt } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Octokit } from "@octokit/rest";
import { PrismaClient, TeamRole, Plan } from "@devpulse/database";

function loadEnv() {
  const candidates = [
    resolve(__dirname, "../../.env"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "apps/api/.env"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
    break;
  }
}

loadEnv();

const prisma = new PrismaClient();

const DEMO_DOMAIN = "devpulse.demo";
const DEMO_PASSWORD = "DevPulse123!";

type RealRepo = {
  owner: string;
  name: string;
  fullName: string;
  displayName: string;
};

/** Authentic public repos used for product demo data */
const REAL_REPOS: RealRepo[] = [
  {
    owner: "colinhacks",
    name: "zod",
    fullName: "colinhacks/zod",
    displayName: "zod",
  },
  {
    owner: "pmndrs",
    name: "zustand",
    fullName: "pmndrs/zustand",
    displayName: "zustand",
  },
  {
    owner: "TanStack",
    name: "query",
    fullName: "TanStack/query",
    displayName: "TanStack Query",
  },
  {
    owner: "drizzle-team",
    name: "drizzle-orm",
    fullName: "drizzle-team/drizzle-orm",
    displayName: "Drizzle ORM",
  },
  {
    owner: "shadcn-ui",
    name: "ui",
    fullName: "shadcn-ui/ui",
    displayName: "shadcn/ui",
  },
  {
    owner: "t3-oss",
    name: "create-t3-app",
    fullName: "t3-oss/create-t3-app",
    displayName: "create-t3-app",
  },
];

const PR_PAGES = 2; // up to 200 real PRs per repo (list endpoint only)
const COMMIT_PAGES = 3; // up to 300 real commits per repo
const PER_PAGE = 100;
const COMMIT_WINDOW_DAYS = 365;
/** Sample of recent PRs to enrich with additions/deletions/reviews */
const DETAIL_SAMPLE = 20;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await new Promise<Buffer>((resolveHash, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, derived) => (err ? reject(err) : resolveHash(derived)),
    );
  });
  return `${salt}:${key.toString("hex")}`;
}

function daysAgo(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function weekPeriod(date = new Date()): string {
  const tmp = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type SeedUser = {
  name: string;
  email: string;
  login: string;
  role: TeamRole;
  image: string;
};

const USERS: SeedUser[] = [
  {
    name: "Ava Chen",
    email: `ava.chen@${DEMO_DOMAIN}`,
    login: "ava.chen",
    role: "owner",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=AvaChen",
  },
  {
    name: "Marcus Webb",
    email: `marcus.webb@${DEMO_DOMAIN}`,
    login: "marcus.webb",
    role: "admin",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=MarcusWebb",
  },
  {
    name: "Sofia Rahman",
    email: `sofia.rahman@${DEMO_DOMAIN}`,
    login: "sofia.rahman",
    role: "member",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=SofiaRahman",
  },
  {
    name: "Jordan Lee",
    email: `jordan.lee@${DEMO_DOMAIN}`,
    login: "jordan.lee",
    role: "viewer",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=JordanLee",
  },
];

async function wipeDemoData() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${DEMO_DOMAIN}` } },
    select: { id: true },
  });
  const userIds = demoUsers.map((u) => u.id);
  if (userIds.length === 0) return;

  const teams = await prisma.team.findMany({
    where: { ownerId: { in: userIds } },
    select: { id: true },
  });
  const teamIds = teams.map((t) => t.id);

  const projects = teamIds.length
    ? await prisma.project.findMany({
        where: { teamId: { in: teamIds } },
        select: { id: true },
      })
    : [];
  const projectIds = projects.map((p) => p.id);

  if (projectIds.length) {
    await prisma.comment.deleteMany({
      where: { pr: { projectId: { in: projectIds } } },
    });
    await prisma.commit.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.pullRequest.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    await prisma.analyticsSnapshot.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }

  if (teamIds.length) {
    await prisma.leaderboardEntry.deleteMany({
      where: { teamId: { in: teamIds } },
    });
    await prisma.goal.deleteMany({ where: { teamId: { in: teamIds } } });
    await prisma.usageRecord.deleteMany({ where: { teamId: { in: teamIds } } });
    await prisma.subscription.deleteMany({ where: { teamId: { in: teamIds } } });
    await prisma.teamMember.deleteMany({ where: { teamId: { in: teamIds } } });
    await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
  }

  await prisma.achievement.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.activity.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function syncRealRepo(
  projectId: string,
  repo: RealRepo,
  octokit: Octokit,
) {
  const { owner, name, fullName } = repo;
  let prsSynced = 0;
  let commitsSynced = 0;
  const errors: string[] = [];

  console.log(`→ Syncing pull requests from ${fullName}...`);
  type ListedPr = Awaited<
    ReturnType<typeof octokit.pulls.list>
  >["data"][number];
  const listed: ListedPr[] = [];

  for (let page = 1; page <= PR_PAGES; page++) {
    const { data: prs } = await octokit.pulls.list({
      owner,
      repo: name,
      state: "all",
      per_page: PER_PAGE,
      page,
      sort: "created",
      direction: "desc",
    });
    if (prs.length === 0) break;
    listed.push(...prs);
    console.log(`   … listed ${listed.length} PRs`);
    if (prs.length < PER_PAGE) break;
  }

  // Bulk upsert from list payload (no per-PR detail calls)
  for (const pr of listed) {
    try {
      const data = {
        number: pr.number,
        title: pr.title ?? "",
        body: pr.body ?? null,
        state: pr.merged_at ? "merged" : pr.state,
        author: pr.user?.login ?? "unknown",
        authorAvatar: pr.user?.avatar_url ?? null,
        projectId,
        createdAt: new Date(pr.created_at),
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        additions: 0,
        deletions: 0,
        changedFiles: 0,
        reviewTime: null as number | null,
        firstReviewAt: null as Date | null,
      };

      await prisma.pullRequest.upsert({
        where: { githubId: BigInt(pr.id) },
        create: { githubId: BigInt(pr.id), ...data },
        update: data,
      });
      prsSynced++;
    } catch (error) {
      errors.push(
        `PR #${pr.number}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  console.log(`   ✓ upserted ${prsSynced} PRs`);

  // Enrich a sample with real additions/deletions + first-review time
  const sample = listed.slice(0, DETAIL_SAMPLE);
  console.log(`→ Enriching ${sample.length} recent PRs with stats/reviews...`);
  let enriched = 0;
  for (const pr of sample) {
    try {
      const [{ data: detail }, { data: reviews }] = await Promise.all([
        octokit.pulls.get({ owner, repo: name, pull_number: pr.number }),
        octokit.pulls.listReviews({
          owner,
          repo: name,
          pull_number: pr.number,
          per_page: 100,
        }),
      ]);

      const firstReviewAt =
        reviews
          .filter((r) => r.submitted_at)
          .map((r) => new Date(r.submitted_at as string))
          .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

      const createdAt = new Date(pr.created_at);
      const reviewTime = firstReviewAt
        ? Math.round(
            (firstReviewAt.getTime() - createdAt.getTime()) / 60000,
          )
        : null;

      await prisma.pullRequest.update({
        where: { githubId: BigInt(pr.id) },
        data: {
          additions: detail.additions ?? 0,
          deletions: detail.deletions ?? 0,
          changedFiles: detail.changed_files ?? 0,
          reviewTime,
          firstReviewAt,
        },
      });
      enriched++;
      if (enriched % 10 === 0) {
        process.stdout.write(`   … enriched ${enriched}\n`);
        await sleep(200);
      }
    } catch (error) {
      errors.push(
        `enrich #${pr.number}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  console.log(`   ✓ enriched ${enriched} PRs`);

  console.log(`→ Syncing commits from ${fullName} (last ${COMMIT_WINDOW_DAYS}d)...`);
  const since = new Date(
    Date.now() - COMMIT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  for (let page = 1; page <= COMMIT_PAGES; page++) {
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo: name,
      since,
      per_page: PER_PAGE,
      page,
    });
    if (commits.length === 0) break;

    for (const commit of commits) {
      try {
        const data = {
          message: commit.commit?.message ?? "",
          author:
            commit.author?.login ??
            commit.commit?.author?.name ??
            "unknown",
          authorAvatar: commit.author?.avatar_url ?? null,
          projectId,
          createdAt: commit.commit?.author?.date
            ? new Date(commit.commit.author.date)
            : new Date(),
          additions: 0,
          deletions: 0,
        };

        await prisma.commit.upsert({
          where: { sha: commit.sha },
          create: { sha: commit.sha, ...data },
          update: data,
        });
        commitsSynced++;
      } catch (error) {
        errors.push(
          `Commit ${commit.sha.slice(0, 7)}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (commits.length < PER_PAGE) break;
    await sleep(200);
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { lastSyncedAt: new Date() },
  });

  return { prsSynced, commitsSynced, errors };
}

async function buildAnalyticsFromRealData(projectId: string) {
  const since = daysAgo(29, 0);
  const [prs, commits] = await Promise.all([
    prisma.pullRequest.findMany({
      where: { projectId, createdAt: { gte: since } },
    }),
    prisma.commit.findMany({
      where: { projectId, createdAt: { gte: since } },
    }),
  ]);

  for (let day = 29; day >= 0; day--) {
    const start = daysAgo(day, 0);
    const end = daysAgo(day - 1, 0);
    const dayPrs = prs.filter((p) => p.createdAt >= start && p.createdAt < end);
    const dayCommits = commits.filter(
      (c) => c.createdAt >= start && c.createdAt < end,
    );
    const merged = dayPrs.filter((p) => p.state === "merged");
    const open = dayPrs.filter((p) => p.state === "open");
    const closed = dayPrs.filter((p) => p.state === "closed");
    const reviewTimes = dayPrs
      .map((p) => p.reviewTime)
      .filter((t): t is number => t != null);
    const quality = dayPrs
      .map((p) => p.aiQualityScore)
      .filter((t): t is number => t != null);
    const authors = new Set(dayCommits.map((c) => c.author));

    await prisma.analyticsSnapshot.create({
      data: {
        projectId,
        date: daysAgo(day, 23),
        totalPRs: dayPrs.length,
        mergedPRs: merged.length,
        openPRs: open.length,
        closedPRs: closed.length,
        avgReviewTime:
          reviewTimes.length > 0
            ? Math.round(
                reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length,
              )
            : null,
        avgPRSize:
          dayPrs.length > 0
            ? Math.round(
                dayPrs.reduce((a, p) => a + p.additions + p.deletions, 0) /
                  dayPrs.length,
              )
            : null,
        mergeRate: dayPrs.length ? merged.length / dayPrs.length : 0,
        avgQualityScore:
          quality.length > 0
            ? Math.round(quality.reduce((a, b) => a + b, 0) / quality.length)
            : null,
        commitsCount: dayCommits.length,
        activeContributors: authors.size,
      },
    });
  }
}

async function seed() {
  if (!process.env.GITHUB_PAT) {
    throw new Error(
      "GITHUB_PAT is required to seed real GitHub data. Set it in apps/api/.env",
    );
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

  console.log(`→ Validating ${REAL_REPOS.length} real repos...`);
  for (const repo of REAL_REPOS) {
    await octokit.repos.get({ owner: repo.owner, repo: repo.name });
    console.log(`   ✓ ${repo.fullName}`);
  }

  console.log("→ Wiping previous @devpulse.demo seed data...");
  await wipeDemoData();

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  console.log("→ Creating demo users (for role exploration)...");

  const createdUsers: Array<SeedUser & { id: string }> = [];
  for (const u of USERS) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        emailVerified: true,
        image: u.image,
        accounts: {
          create: {
            accountId: u.email,
            providerId: "credential",
            password: passwordHash,
          },
        },
      },
    });
    createdUsers.push({ ...u, id: user.id });
  }

  const owner = createdUsers.find((u) => u.role === "owner")!;
  console.log("→ Creating team + Pro subscription...");

  const team = await prisma.team.create({
    data: {
      name: "Northwind Engineering",
      slug: "northwind-engineering",
      ownerId: owner.id,
      members: {
        create: createdUsers.map((u) => ({
          userId: u.id,
          role: u.role,
        })),
      },
      subscription: {
        create: {
          plan: Plan.pro,
          status: "active",
          currentPeriodStart: daysAgo(12, 0),
          currentPeriodEnd: daysAgo(-18, 0),
        },
      },
    },
  });

  const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  type ProjectSync = {
    projectId: string;
    repo: RealRepo;
    prsSynced: number;
    commitsSynced: number;
  };
  const syncedProjects: ProjectSync[] = [];

  for (const repo of REAL_REPOS) {
    console.log(`\n→ Creating project for ${repo.fullName}...`);
    const project = await prisma.project.create({
      data: {
        name: repo.displayName,
        githubRepo: repo.fullName,
        provider: "github",
        teamId: team.id,
        autoReview: true,
      },
    });

    const sync = await syncRealRepo(project.id, repo, octokit);
    console.log(
      `   ✓ synced ${sync.prsSynced} PRs, ${sync.commitsSynced} commits` +
        (sync.errors.length ? ` (${sync.errors.length} warnings)` : ""),
    );
    if (sync.errors.length) {
      console.log("   first warnings:", sync.errors.slice(0, 3));
    }

    console.log(`→ Building analytics for ${repo.displayName}...`);
    await buildAnalyticsFromRealData(project.id);

    syncedProjects.push({
      projectId: project.id,
      repo,
      prsSynced: sync.prsSynced,
      commitsSynced: sync.commitsSynced,
    });
  }

  const projectIds = syncedProjects.map((p) => p.projectId);
  const prCount = await prisma.pullRequest.count({
    where: { projectId: { in: projectIds } },
  });
  const commitCount = await prisma.commit.count({
    where: { projectId: { in: projectIds } },
  });
  const mergedCount = await prisma.pullRequest.count({
    where: { projectId: { in: projectIds }, state: "merged" },
  });

  await prisma.usageRecord.createMany({
    data: [
      {
        teamId: team.id,
        type: "project",
        count: syncedProjects.length,
        period,
      },
      {
        teamId: team.id,
        type: "team_member",
        count: createdUsers.length,
        period,
      },
      { teamId: team.id, type: "ai_analysis", count: 0, period },
      {
        teamId: team.id,
        type: "sync",
        count: syncedProjects.length,
        period,
      },
    ],
  });

  // SaaS demo extras (goals / audit) — not inventing git history
  const avgReview = await prisma.pullRequest.aggregate({
    where: { projectId: { in: projectIds }, reviewTime: { not: null } },
    _avg: { reviewTime: true },
  });

  await prisma.goal.createMany({
    data: [
      {
        teamId: team.id,
        title: "Keep average review time under 24h",
        description: "Tracked against live synced repository activity.",
        metric: "review_time",
        target: 1440,
        current: Math.round(avgReview._avg.reviewTime ?? 0),
        deadline: daysAgo(-21, 12),
        status: "active",
      },
      {
        teamId: team.id,
        title: "Monitor merged PR volume",
        description: "Throughput goal based on synced repository activity.",
        metric: "pr_count",
        target: Math.max(mergedCount, 10),
        current: mergedCount,
        deadline: daysAgo(-10, 18),
        status: "active",
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: owner.id,
        action: "create_team",
        resource: "team",
        resourceId: team.id,
        metadata: { name: team.name },
        ipAddress: "203.0.113.10",
        userAgent: "DevPulse Seed",
        createdAt: daysAgo(2, 11),
      },
      ...syncedProjects.map((p, i) => ({
        userId: owner.id,
        action: "create_project",
        resource: "project",
        resourceId: p.projectId,
        metadata: { repo: p.repo.fullName, source: "github-api" },
        ipAddress: "203.0.113.10",
        userAgent: "DevPulse Seed",
        createdAt: daysAgo(1, 14 - i),
      })),
      ...syncedProjects.map((p) => ({
        userId: owner.id,
        action: "sync_project",
        resource: "project",
        resourceId: p.projectId,
        metadata: {
          prsSynced: p.prsSynced,
          commitsSynced: p.commitsSynced,
        },
        ipAddress: "203.0.113.10",
        userAgent: "DevPulse Seed",
        createdAt: new Date(),
      })),
    ],
  });

  // Light leaderboard for demo users (RBAC exploration) — scores proportional to real repo volume
  const periodKey = weekPeriod();
  const metrics = ["prs_merged", "commits", "quality_score", "review_speed"];
  for (const metric of metrics) {
    for (let i = 0; i < createdUsers.length; i++) {
      await prisma.leaderboardEntry.create({
        data: {
          teamId: team.id,
          userId: createdUsers[i].id,
          period: periodKey,
          metric,
          score: Math.max(1, Math.round((prCount + commitCount) / (i + 3))),
          rank: i + 1,
        },
      });
    }
  }

  console.log("\n✅ Real-data seed complete\n");
  console.log(`Projects   : ${syncedProjects.length}`);
  for (const p of syncedProjects) {
    console.log(
      `  - ${p.repo.fullName}  (${p.prsSynced} PRs, ${p.commitsSynced} commits)`,
    );
  }
  console.log(`PRs total  : ${prCount}`);
  console.log(`Commits    : ${commitCount}`);
  console.log(`Merged PRs : ${mergedCount}`);
  console.log("\nDemo logins (password: DevPulse123!)\n");
  for (const u of createdUsers) {
    console.log(`  [${u.role.padEnd(6)}] ${u.email}`);
  }
  console.log("");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
