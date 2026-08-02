import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  Boxes,
  Gauge,
  GitPullRequest,
  LineChart,
  ShieldCheck,
  Terminal,
  Workflow,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteHeader } from "./site-header";
import { HeroVisual } from "./hero-visual";
import { SmoothScroll } from "./smooth-scroll";

const proof = ["GitHub", "GitLab", "Slack", "VS Code", "CLI"];

const steps = [
  {
    step: "01",
    title: "Connect your repos",
    body: "Link GitHub or GitLab in minutes. DevPulse syncs pull requests, commits, and review activity automatically.",
  },
  {
    step: "02",
    title: "See the real pulse",
    body: "Velocity, review time, DORA signals, and contributor patterns land in one dashboard your team will actually open.",
  },
  {
    step: "03",
    title: "Act with AI",
    body: "Standups, PR quality scores, sprint forecasts, and anomaly alerts turn raw git noise into decisions.",
  },
];

const analyticsPoints = [
  {
    title: "DORA metrics that stick",
    body: "Deployment frequency, lead time, change fail rate, and restore time — tracked weekly without spreadsheet theater.",
  },
  {
    title: "Benchmarks, not vibes",
    body: "Compare your team against industry ranges so “we’re slow” becomes a measurable gap you can close.",
  },
  {
    title: "Goals with progress",
    body: "Set targets for review speed or merge volume and watch progress update as work ships.",
  },
];

const aiPoints = [
  {
    icon: Bot,
    title: "Auto PR reviews",
    body: "Optional AI comments on newly opened pull requests — quality signal before humans pile on.",
  },
  {
    icon: Gauge,
    title: "Sprint prediction",
    body: "Forecast completion risk from current WIP, review lag, and historical throughput.",
  },
  {
    icon: Activity,
    title: "Wellness signals",
    body: "Spot burnout patterns early with workload and after-hours commit trends.",
  },
];

const ecosystem = [
  {
    icon: Terminal,
    title: "CLI",
    body: "Standups, stats, sync, and PR analysis from your terminal.",
  },
  {
    icon: Boxes,
    title: "VS Code",
    body: "Team pulse and quick actions without leaving the editor.",
  },
  {
    icon: GitPullRequest,
    title: "Browser extension",
    body: "AI PR insights inline on GitHub pull request pages.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    detail: "For small teams validating the workflow.",
    features: ["3 projects", "5 members", "30-day history", "Basic AI"],
    cta: "Start free",
    href: "/signup",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    detail: "For teams shipping every week.",
    features: [
      "Unlimited projects",
      "Unlimited members",
      "Advanced AI",
      "API + webhooks",
    ],
    cta: "Start Pro trial",
    href: "/signup",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "$49",
    detail: "For orgs that need depth and control.",
    features: [
      "365-day history",
      "SSO-ready path",
      "Priority support",
      "All Pro features",
    ],
    cta: "Talk to us",
    href: "/signup",
    featured: false,
  },
];

export function LandingPage() {
  return (
    <SmoothScroll>
    <div className="dark marketing-shell relative min-h-screen text-foreground">
      <div className="pointer-events-none absolute inset-0 marketing-grid opacity-50" />
      <SiteHeader />

      {/* 1. Hero */}
      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0">
          <HeroVisual />
        </div>
        <div className="absolute inset-0 bg-linear-to-r from-background/95 via-background/75 to-background/20" />
        <div className="absolute inset-0 bg-linear-to-t from-background/90 via-transparent to-background/45" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl items-end px-6 pb-16 pt-28 sm:items-center sm:pb-24">
          <div className="animate-marketing-rise max-w-xl">
            <p className="text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              DevPulse
            </p>
            <h1 className="mt-5 text-2xl font-medium leading-snug tracking-tight text-foreground/95 sm:text-3xl">
              Engineering analytics that feel like a heartbeat, not a report.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Unify velocity, code quality, and AI insights so shipping teams
              know what to fix next.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 px-5 text-base",
                )}
              >
                Start free
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 px-5 text-base",
                )}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Proof */}
      <section className="relative border-y border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Built for modern delivery stacks
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {proof.map((item) => (
              <span
                key={item}
                className="text-sm font-semibold tracking-wide text-foreground/70"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Why */}
      <section className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="marketing-panel max-w-2xl rounded-3xl p-8 sm:p-10">
          <p className="text-sm font-medium tracking-wide text-primary">
            Why DevPulse
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Git history is rich. Most dashboards make it boring.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Spreadsheets lag. Generic BI tools miss developer context. DevPulse
            turns repository signal into a living pulse your eng leaders and ICs
            can share.
          </p>
        </div>
      </section>

      {/* 4. Product */}
      <section id="product" className="relative py-20 sm:py-24">
        <div className="absolute inset-0 bg-card/25" />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-wide text-primary">
              Product
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              From repo connect to action in three steps
            </h2>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((item) => (
              <li key={item.step} className="marketing-panel rounded-2xl p-6">
                <span className="text-sm font-semibold text-primary">
                  {item.step}
                </span>
                <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. Analytics */}
      <section
        id="analytics"
        className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24"
      >
        <div className="marketing-panel grid items-start gap-10 rounded-3xl p-8 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div>
            <p className="text-sm font-medium tracking-wide text-primary">
              Analytics
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              DORA, velocity, and quality in one pane
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Stop bouncing between GitHub Insights, spreadsheets, and gut feel.
              DevPulse keeps the metrics engineering managers ask for every week.
            </p>
          </div>
          <div className="space-y-6 border-l border-border pl-6 sm:pl-8">
            {analyticsPoints.map((point) => (
              <div key={point.title}>
                <div className="flex items-center gap-2 text-primary">
                  <LineChart className="size-4" />
                  <h3 className="text-lg font-semibold text-foreground">
                    {point.title}
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {point.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. AI */}
      <section id="ai" className="relative py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 marketing-aurora opacity-60" />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-wide text-primary">
              AI superpowers
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Assistants that sit inside the delivery loop
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Groq-powered analysis for reviews, standups, forecasts, and
              wellness — always grounded in your actual repository data.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {aiPoints.map(({ icon: Icon, title, body }) => (
              <div key={title} className="marketing-panel rounded-2xl p-6">
                <Icon className="size-5 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Ecosystem */}
      <section
        id="ecosystem"
        className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24"
      >
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-primary">
            Ecosystem
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Meet developers where work already happens
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ecosystem.map(({ icon: Icon, title, body }) => (
            <div key={title} className="marketing-panel rounded-2xl p-6">
              <Icon className="size-5 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Trust */}
      <section className="relative border-y border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">
                Built for teams that care about audit trails
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Role-based access, usage limits, and organization audit logs keep
                SaaS hygiene in place as you scale seats.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Workflow className="size-4 text-primary" />
            Background jobs · realtime feed · plan controls
          </div>
        </div>
      </section>

      {/* 9. Pricing */}
      <section
        id="pricing"
        className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24"
      >
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-primary">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple plans that grow with the team
          </h2>
        </div>
        <div className="mt-12 grid items-stretch gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "marketing-panel flex h-full flex-col rounded-2xl p-6",
                plan.featured && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                {plan.featured && (
                  <span className="text-xs font-medium text-primary">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{plan.detail}</p>
              <p className="mt-6 text-4xl font-semibold">
                {plan.price}
                <span className="text-base font-normal text-muted-foreground">
                  /mo
                </span>
              </p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={cn(
                  buttonVariants({
                    variant: plan.featured ? "default" : "outline",
                  }),
                  "mt-8 h-10 w-full",
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 10. CTA + footer */}
      <section className="relative overflow-hidden border-t border-border">
        <div className="pointer-events-none absolute inset-0 marketing-aurora opacity-70" />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
          <div className="marketing-panel rounded-3xl px-6 py-12 sm:px-10">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Feel the pulse of delivery again
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Create a free workspace, connect a repo, and get your first AI
              standup before standup ends.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 px-6 text-base",
                )}
              >
                Create your workspace
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 px-6 text-base",
                )}
              >
                I already have an account
              </Link>
            </div>
          </div>
        </div>

        <footer className="relative border-t border-border bg-card/30">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Activity className="size-3.5" />
              </span>
              <span className="text-sm font-semibold">DevPulse</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered developer analytics for shipping teams.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/login" className="hover:text-foreground">
                Sign in
              </Link>
              <Link href="/signup" className="hover:text-foreground">
                Sign up
              </Link>
              <a href="#pricing" className="hover:text-foreground">
                Pricing
              </a>
            </div>
          </div>
        </footer>
      </section>
    </div>
    </SmoothScroll>
  );
}
