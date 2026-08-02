"use client";

import { useState } from "react";
import { Zap, Github, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
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
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/dashboard",
      });
      if (error) {
        const message = error.message ?? "Failed to sign in. Please try again.";
        setError(message);
        toast.error(message);
        setLoading(false);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      setError(message);
      toast.error(message);
      setLoading(false);
    }
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
          <CardContent className="space-y-3">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
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
