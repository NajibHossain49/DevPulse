"use client";

import { useEffect, useState } from "react";
import { Github, CheckCircle2, Zap, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import PasswordSettings from "@/components/auth/password-settings";

function initials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "?";
}

export default function SettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadAccounts() {
      try {
        const { data } = await authClient.listAccounts();
        if (cancelled) return;
        const accounts = Array.isArray(data) ? data : [];
        setProviders(accounts.map((account) => account.providerId));
      } catch {
        if (!cancelled) setProviders([]);
      }
    }
    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasGithub = providers.includes("github");
  const hasCredential = providers.includes("credential");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your personal account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPending ? (
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Avatar size="lg" className="size-16">
                  <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
                  <AvatarFallback>{initials(user?.name, user?.email)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{user?.name ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-name">Name</Label>
                  <Input id="settings-name" value={user?.name ?? ""} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-email">Email</Label>
                  <Input id="settings-email" value={user?.email ?? ""} readOnly disabled />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <PasswordSettings />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Accounts</CardTitle>
          <CardDescription>Manage your linked sign-in methods.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Mail className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Email &amp; Password</p>
                <p className="text-xs text-muted-foreground">
                  Sign in with your email address.
                </p>
              </div>
            </div>
            {hasCredential ? (
              <Badge className="bg-green-500/15 text-green-500">
                <CheckCircle2 className="size-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">Not set</Badge>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Github className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium">GitHub</p>
                <p className="text-xs text-muted-foreground">
                  Used for sign-in and repository access.
                </p>
              </div>
            </div>
            {hasGithub ? (
              <Badge className="bg-green-500/15 text-green-500">
                <CheckCircle2 className="size-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">Not connected</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <span className="font-semibold">DevPulse</span>
            <Badge variant="secondary">v1.0.0</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Engineering analytics for modern development teams
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
