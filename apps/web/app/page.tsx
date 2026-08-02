import Link from "next/link";
import { Activity, GitPullRequest, Sparkles, Gauge } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: GitPullRequest,
    title: "PR Insights",
    description:
      "Track review time, merge rate, and PR size across every repository.",
  },
  {
    icon: Sparkles,
    title: "AI Summaries",
    description:
      "Automatic AI-generated summaries and quality scores for pull requests.",
  },
  {
    icon: Gauge,
    title: "Velocity Metrics",
    description:
      "Understand team throughput and development velocity over time.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-28 pb-16 text-center">
        <Badge variant="secondary" className="mb-6 gap-1.5">
          <Activity className="size-3.5" />
          AI-Powered Developer Analytics
        </Badge>

        <h1 className="bg-linear-to-br from-brand-from to-brand-to bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
          DevPulse
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Track team productivity, code quality, and development velocity with
          AI-powered insights — all in one dashboard.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-base")}
          >
            Get Started
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 px-6 text-base"
            )}
          >
            View on GitHub
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 px-6 pb-24 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardHeader>
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-linear-to-br from-brand-from to-brand-to text-white">
                <Icon className="size-5" />
              </div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}
