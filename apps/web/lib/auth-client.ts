import { createAuthClient } from "better-auth/react";

// NOTE: Better Auth's route handler is mounted on THIS Next.js app
// (apps/web at :3000), not the NestJS API (:3001). The auth client must
// therefore target the web app's own origin. We default to
// BETTER_AUTH_URL / the browser origin rather than NEXT_PUBLIC_API_URL
// (which points at the Nest API and would break sign-in).
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || undefined,
});

export const { signIn, signUp, signOut, useSession } = authClient;
