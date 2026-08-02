"use client";

import { useState } from "react";
import { Zap, Github, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/dashboard",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-card px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-linear-to-br from-brand-from to-brand-to">
            <Zap className="size-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">DevPulse</h1>
          <p className="mt-2 text-muted-foreground">
            AI-Powered Developer Analytics
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in with your GitHub account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSignIn}
              disabled={loading}
              className="h-11 w-full text-sm"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Github />}
              {loading ? "Signing in..." : "Sign in with GitHub"}
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Built with Next.js + AI
        </p>
      </div>
    </div>
  );
}
