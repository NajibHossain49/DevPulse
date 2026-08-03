"use client";

import Link from "next/link";
import AuthForm from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in with email and password, pick a demo role for a quick tour, or continue with GitHub."
      footer={
        <>
          New to DevPulse?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <AuthForm defaultMode="signin" showDemoPicker />
    </AuthShell>
  );
}
