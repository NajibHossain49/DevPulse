import { prisma } from "@devpulse/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Temporary diagnostics for production auth 500s.
 * Returns only booleans / counts — never secret values.
 * Remove this route once login works.
 */
export async function GET() {
  const env = {
    NODE_ENV: process.env.NODE_ENV ?? null,
    hasBETTER_AUTH_SECRET: Boolean(process.env.BETTER_AUTH_SECRET?.trim()),
    hasBETTER_AUTH_URL: Boolean(process.env.BETTER_AUTH_URL?.trim()),
    hasNEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
    hasDATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
    hasDIRECT_URL: Boolean(process.env.DIRECT_URL?.trim()),
    hasGITHUB_CLIENT_ID: Boolean(process.env.GITHUB_CLIENT_ID?.trim()),
    hasGITHUB_CLIENT_SECRET: Boolean(process.env.GITHUB_CLIENT_SECRET?.trim()),
    betterAuthUrl: process.env.BETTER_AUTH_URL ?? null,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
  };

  let db: { ok: boolean; demoUsers?: number; error?: string } = { ok: false };
  try {
    const demoUsers = await prisma.user.count({
      where: { email: { endsWith: "@devpulse.demo" } },
    });
    db = { ok: true, demoUsers };
  } catch (error) {
    db = {
      ok: false,
      error: error instanceof Error ? error.message.slice(0, 240) : String(error),
    };
  }

  return Response.json({ env, db });
}
