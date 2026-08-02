import Link from "next/link";
import { Activity } from "lucide-react";
import { HeroVisual } from "@/components/landing/hero-visual";

export function AuthShell({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="dark grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <HeroVisual />
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background via-background/80 to-transparent p-10">
          <p className="text-2xl font-semibold tracking-tight">
            Know what your engineering org is really shipping.
          </p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Velocity, DORA, AI reviews, and team wellness — one pulse for the
            whole delivery loop.
          </p>
        </div>
      </div>

      <div className="marketing-shell relative flex flex-col">
        <div className="pointer-events-none absolute inset-0 marketing-grid opacity-40" />
        <div className="pointer-events-none absolute inset-0 marketing-aurora opacity-50" />
        <div className="relative flex flex-1 flex-col px-6 py-8 sm:px-10">
          <Link href="/" className="inline-flex items-center gap-2.5 self-start">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="size-5" />
            </span>
            <span className="text-xl font-semibold tracking-tight">
              DevPulse
            </span>
          </Link>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>

            <div className="marketing-panel rounded-2xl p-6 sm:p-7">
              {children}
            </div>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to use DevPulse for your team workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
