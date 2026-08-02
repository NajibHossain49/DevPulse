"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGetData, apiPostData } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, GitBranch, Brain, CheckCircle } from "lucide-react";

const TEAM_STORAGE_KEY = "devpulse.currentTeamId";

interface UsageData {
  plan: string;
  period: string;
  projects: { used: number; limit: number };
  teamMembers: { used: number; limit: number };
  aiAnalysis: { used: number; limit: number };
  features: Record<string, boolean>;
}

interface TeamSummary {
  id: string;
  name: string;
}

function percent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, (used / limit) * 100);
}

function formatLimit(limit: number): string {
  return limit === -1 ? "∞" : String(limit);
}

export default function BillingPage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveTeamId = useCallback(async (): Promise<string | null> => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(TEAM_STORAGE_KEY)
        : null;
    const teams = await apiGetData<TeamSummary[]>("/teams");
    const resolved =
      teams.find((t) => t.id === stored)?.id ?? teams[0]?.id ?? null;
    return resolved;
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const id = await resolveTeamId();
      if (!id) {
        setError("Create a team first to view billing.");
        return;
      }
      setTeamId(id);
      const data = await apiGetData<UsageData>(`/usage?teamId=${id}`);
      setUsage(data);
    } catch {
      setError("Failed to load usage data");
      toast.error("Failed to load usage data");
    }
  }, [resolveTeamId]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  async function handleUpgrade(plan: "pro" | "enterprise") {
    if (!teamId) return;
    setLoading(true);
    try {
      const { url } = await apiPostData<{ url: string }>("/billing/checkout", {
        teamId,
        plan,
      });
      if (url) window.location.href = url;
      else toast.error("Checkout is not available. Configure Stripe keys.");
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setLoading(false);
    }
  }

  if (error && !usage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing &amp; Usage</h1>
          <p className="text-muted-foreground">
            Manage your subscription and monitor usage
          </p>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing &amp; Usage</h1>
          <p className="text-muted-foreground">
            Manage your subscription and monitor usage
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "For small teams getting started",
      features: [
        "3 projects",
        "5 team members",
        "30-day history",
        "Basic AI insights",
      ],
      current: usage.plan === "free",
    },
    {
      name: "Pro",
      price: "$19",
      description: "For growing engineering teams",
      features: [
        "Unlimited projects",
        "Unlimited members",
        "90-day history",
        "Advanced AI",
        "API access",
        "Webhooks",
      ],
      current: usage.plan === "pro",
    },
    {
      name: "Enterprise",
      price: "$49",
      description: "For large organizations",
      features: [
        "Everything in Pro",
        "365-day history",
        "SSO/SAML",
        "On-premise option",
        "Priority support",
      ],
      current: usage.plan === "enterprise",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing &amp; Usage</h1>
        <p className="text-muted-foreground">
          Manage your subscription and monitor usage
        </p>
      </div>

      {/* Usage Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage.projects.used} / {formatLimit(usage.projects.limit)}
            </div>
            <Progress
              value={percent(usage.projects.used, usage.projects.limit)}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage.teamMembers.used} / {formatLimit(usage.teamMembers.limit)}
            </div>
            <Progress
              value={percent(usage.teamMembers.used, usage.teamMembers.limit)}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Analysis</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage.aiAnalysis.used} / {formatLimit(usage.aiAnalysis.limit)}
            </div>
            <Progress
              value={percent(usage.aiAnalysis.used, usage.aiAnalysis.limit)}
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Pricing Plans */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.current ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.current && <Badge>Current</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4 text-3xl font-bold">
                {plan.price}
                <span className="text-lg font-normal text-muted-foreground">
                  /mo
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm"
                  >
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              {!plan.current && plan.name !== "Free" && (
                <Button
                  className="w-full"
                  onClick={() =>
                    handleUpgrade(
                      plan.name.toLowerCase() as "pro" | "enterprise",
                    )
                  }
                  disabled={loading}
                >
                  {loading ? "Loading..." : `Upgrade to ${plan.name}`}
                </Button>
              )}
              {plan.current && (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
