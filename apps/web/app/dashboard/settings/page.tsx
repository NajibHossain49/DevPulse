"use client";

import { Github, CheckCircle2, Zap } from "lucide-react";
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Accounts</CardTitle>
          <CardDescription>Manage your linked integrations.</CardDescription>
        </CardHeader>
        <CardContent>
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
            <Badge className="bg-green-500/15 text-green-500">
              <CheckCircle2 className="size-3" />
              Connected
            </Badge>
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
            Built with Next.js 15 + NestJS + AI
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
