"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Heart,
  Target,
  FileText,
  Trophy,
  Shield,
  CreditCard,
  Plug,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: GitBranch },
  { label: "Teams", href: "/dashboard/teams", icon: Users },
  { label: "Wellness", href: "/dashboard/team/wellness", icon: Heart },
  { label: "Goals", href: "/dashboard/goals", icon: Target },
  { label: "Reports", href: "/dashboard/reports", icon: FileText },
  { label: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy },
  { label: "Audit Logs", href: "/dashboard/admin/audit", icon: Shield },
  { label: "Billing", href: "/dashboard/settings/billing", icon: CreditCard },
  {
    label: "Integrations",
    href: "/dashboard/settings/integrations",
    icon: Plug,
  },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";

  const matches =
    pathname === href || pathname.startsWith(`${href}/`);
  if (!matches) return false;

  // Prefer the most specific nav item (e.g. /settings/billing over /settings).
  const hasMoreSpecificMatch = NAV_ITEMS.some(
    (item) =>
      item.href !== href &&
      item.href.length > href.length &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );

  return !hasMoreSpecificMatch;
}

export function NavLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-2">
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0",
              active &&
                "bg-muted text-foreground before:absolute before:top-1/2 before:left-0 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary",
            )}
          >
            <Icon className="size-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
