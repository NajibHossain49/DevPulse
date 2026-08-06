import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = toNextJsHandler(auth.handler);

async function withErrorLogging(
  method: "GET" | "POST",
  req: Request,
): Promise<Response> {
  try {
    return await handler[method](req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown auth error";
    console.error("[auth] unhandled error:", message, error);
    return Response.json(
      {
        error: "AUTH_INTERNAL_ERROR",
        message,
        hints: {
          hasSecret: Boolean(process.env.BETTER_AUTH_SECRET?.trim()),
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
          hasBetterAuthUrl: Boolean(process.env.BETTER_AUTH_URL?.trim()),
        },
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return withErrorLogging("GET", req);
}

export async function POST(req: Request) {
  return withErrorLogging("POST", req);
}
