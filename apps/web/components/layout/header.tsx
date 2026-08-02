"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Bell, Zap, User, Settings, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { apiGetData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { NavLinks, NAV_ITEMS } from "./nav-items";
import { TeamSwitcher } from "./team-switcher";
import type { SidebarUser } from "./sidebar";

export function Header({
  user,
  title,
}: {
  user: SidebarUser;
  title?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const pageTitle = title ?? deriveTitle(pathname);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/40 px-4">
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                aria-label="Open menu"
              />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b border-border">
              <SheetTitle className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-brand-from to-brand-to">
                  <Zap className="size-4 text-white" />
                </div>
                DevPulse
              </SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <h1 className="text-base font-semibold">{pageTitle}</h1>
        <div className="hidden sm:block">
          <TeamSwitcher />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <AlertsBell />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Account menu"
              />
            }
          >
            <Avatar size="sm">
              {user.image ? <AvatarImage src={user.image} alt="" /> : null}
              <AvatarFallback>
                {initials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="truncate font-medium text-foreground">
                    {user.name ?? "User"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href="/dashboard/settings" />}
            >
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/dashboard/settings" />}
            >
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

interface AlertItem {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
}

function AlertsBell() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    let active = true;
    const load = () => {
      apiGetData<AlertItem[]>("/alerts")
        .then((data) => {
          if (active) setAlerts(data);
        })
        .catch(() => {
          // silently ignore — alerts are best-effort
        });
    };
    load();
    const interval = setInterval(load, 300000); // every 5 minutes
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const count = alerts.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            aria-label="Notifications"
          />
        }
      >
        <Bell className="size-5" />
        {count > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]"
          >
            {count}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Alerts</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {alerts.length === 0 ? (
          <DropdownMenuItem disabled>No alerts</DropdownMenuItem>
        ) : (
          alerts.slice(0, 5).map((alert) => (
            <DropdownMenuItem
              key={alert.id}
              className="flex flex-col items-start gap-1 p-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${
                    alert.severity === "high"
                      ? "bg-red-500"
                      : alert.severity === "medium"
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                  }`}
                />
                <span className="text-sm font-medium">{alert.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {alert.description}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function deriveTitle(pathname: string): string {
  const match = NAV_ITEMS.find((item) =>
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href),
  );
  return match?.label ?? "Dashboard";
}

function initials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return (email?.[0] ?? "U").toUpperCase();
}
