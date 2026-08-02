import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Server-only Better Auth `setPassword` wrapper for OAuth users who
 * want to add an email/password credential to their account.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { newPassword?: string };
    const newPassword = body.newPassword?.trim();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { error: "Password must be at most 128 characters." },
        { status: 400 },
      );
    }

    await auth.api.setPassword({
      body: { newPassword },
      headers: await headers(),
    });

    return NextResponse.json({ status: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to set password.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
