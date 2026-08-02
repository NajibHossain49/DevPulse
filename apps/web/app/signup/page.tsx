"use client";

import Link from "next/link";
import AuthForm from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your workspace"
      description="Start free with email and password, or jump in with GitHub in one click."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm defaultMode="signup" />
    </AuthShell>
  );
}
