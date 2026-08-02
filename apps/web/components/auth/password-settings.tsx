"use client";

import { useEffect, useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function PasswordSettings() {
  const [hasCredential, setHasCredential] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      try {
        const { data, error } = await authClient.listAccounts();
        if (cancelled) return;
        if (error) {
          setHasCredential(false);
          return;
        }
        const accounts = Array.isArray(data) ? data : [];
        setHasCredential(
          accounts.some((account) => account.providerId === "credential"),
        );
      } catch {
        if (!cancelled) setHasCredential(false);
      }
    }

    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (hasCredential) {
        if (!currentPassword) {
          toast.error("Current password is required.");
          setLoading(false);
          return;
        }
        const { error } = await authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        });
        if (error) {
          toast.error(error.message ?? "Failed to change password.");
          setLoading(false);
          return;
        }
        toast.success("Password updated. Other sessions were signed out.");
      } else {
        const res = await fetch("/api/auth/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        });
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          toast.error(payload.error ?? "Failed to set password.");
          setLoading(false);
          return;
        }
        setHasCredential(true);
        toast.success("Password added — you can now sign in with email.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" />
          Password
        </CardTitle>
        <CardDescription>
          {hasCredential === null
            ? "Manage your account password."
            : hasCredential
              ? "Change your email/password credentials."
              : "Add a password so you can also sign in with email."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasCredential === null ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {hasCredential && (
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              {loading
                ? "Saving..."
                : hasCredential
                  ? "Update password"
                  : "Set password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
