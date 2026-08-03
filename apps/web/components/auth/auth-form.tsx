"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Github, Loader2, AlertCircle, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoAccountPicker } from "@/components/auth/demo-account-picker";
import type { DemoAccount } from "@/lib/demo-accounts";

type Mode = "signin" | "signup";

export default function AuthForm({
  defaultMode = "signin",
  showModeSwitch = false,
  showDemoPicker = false,
}: {
  defaultMode?: Mode;
  /** When false (default on dedicated pages), only the selected mode is shown. */
  showModeSwitch?: boolean;
  /** Recruiter-friendly demo role dropdown (login only). */
  showDemoPicker?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [demoId, setDemoId] = useState<string | null>(null);
  const [loading, setLoading] = useState<"email" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyDemoAccount(account: DemoAccount) {
    setDemoId(account.id);
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
    toast.message(`Filled ${account.role} demo`, {
      description: account.email,
    });
  }

  const resetError = () => setError(null);

  const handleGithub = async () => {
    setLoading("github");
    setError(null);
    try {
      const { error: authError } = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/dashboard",
      });
      if (authError) {
        const message = authError.message ?? "Failed to sign in with GitHub.";
        setError(message);
        toast.error(message);
        setLoading(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to sign in with GitHub.";
      setError(message);
      toast.error(message);
      setLoading(null);
    }
  };

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) {
        setError("Name is required.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading("email");
    try {
      if (mode === "signup") {
        const { error: authError } = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
          callbackURL: "/dashboard",
        });
        if (authError) {
          const message = authError.message ?? "Failed to create account.";
          setError(message);
          toast.error(message);
          setLoading(null);
          return;
        }
        toast.success("Account created — welcome to DevPulse!");
      } else {
        const { error: authError } = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: "/dashboard",
        });
        if (authError) {
          const message = authError.message ?? "Invalid email or password.";
          setError(message);
          toast.error(message);
          setLoading(null);
          return;
        }
        toast.success("Signed in successfully");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : mode === "signup"
            ? "Failed to create account."
            : "Failed to sign in.";
      setError(message);
      toast.error(message);
      setLoading(null);
    }
  };

  const signinForm = (
    <form onSubmit={handleEmailAuth} className="space-y-3">
      {showDemoPicker && (
        <DemoAccountPicker value={demoId} onSelect={applyDemoAccount} />
      )}
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 pl-9"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 pl-9"
            required
            minLength={8}
          />
        </div>
      </div>
      <Button type="submit" disabled={loading !== null} className="h-11 w-full">
        {loading === "email" ? <Loader2 className="animate-spin" /> : null}
        {loading === "email" ? "Signing in..." : "Sign in with Email"}
      </Button>
    </form>
  );

  const signupForm = (
    <form onSubmit={handleEmailAuth} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Name</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signup-name"
            type="text"
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 pl-9"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 pl-9"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 pl-9"
            required
            minLength={8}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-confirm">Confirm password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-10 pl-9"
            required
            minLength={8}
          />
        </div>
      </div>
      <Button type="submit" disabled={loading !== null} className="h-11 w-full">
        {loading === "email" ? <Loader2 className="animate-spin" /> : null}
        {loading === "email" ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showModeSwitch ? (
        <Tabs
          value={mode}
          onValueChange={(value) => {
            setMode(value as Mode);
            resetError();
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="mt-4">
            {signinForm}
          </TabsContent>
          <TabsContent value="signup" className="mt-4">
            {signupForm}
          </TabsContent>
        </Tabs>
      ) : mode === "signin" ? (
        signinForm
      ) : (
        signupForm
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGithub}
        disabled={loading !== null}
        className="h-11 w-full"
      >
        {loading === "github" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Github />
        )}
        {loading === "github" ? "Redirecting..." : "Continue with GitHub"}
      </Button>
    </div>
  );
}
