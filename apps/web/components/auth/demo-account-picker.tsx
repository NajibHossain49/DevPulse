"use client";

import { Users } from "lucide-react";
import { DEMO_ACCOUNTS, type DemoAccount } from "@/lib/demo-accounts";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DemoAccountPicker({
  value = null,
  onSelect,
}: {
  value?: string | null;
  onSelect: (account: DemoAccount) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-primary" />
        <Label htmlFor="demo-account" className="text-sm font-medium">
          Explore as demo user
        </Label>
      </div>
      
      <Select
        value={value || null}
        onValueChange={(id) => {
          const account = DEMO_ACCOUNTS.find((a) => a.id === String(id));
          if (account) onSelect(account);
        }}
      >
        <SelectTrigger id="demo-account" className="h-10 w-full">
          <SelectValue placeholder="Select a role…">
            {(selected: string | null) => {
              const account = DEMO_ACCOUNTS.find((a) => a.id === selected);
              if (!account) return "Select a role…";
              return `${account.role} — ${account.name}`;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger className="min-w-[var(--anchor-width)]">
          {DEMO_ACCOUNTS.map((account) => (
            <SelectItem key={account.id} value={account.id} label={`${account.role} — ${account.name}`}>
              <span className="flex flex-col gap-0.5 py-0.5 text-left">
                <span className="font-medium capitalize">
                  {account.role} — {account.name}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {account.email}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
