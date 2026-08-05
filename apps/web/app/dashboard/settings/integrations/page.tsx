"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Send } from "lucide-react";
import { apiGetData } from "@/lib/api";

type TelegramHealth = {
  enabled: boolean;
  hasDefaultChat: boolean;
};

export default function IntegrationsPage() {
  const [health, setHealth] = useState<TelegramHealth | null>(null);

  useEffect(() => {
    apiGetData<TelegramHealth>("/telegram/health")
      .then(setHealth)
      .catch(() => setHealth({ enabled: false, hasDefaultChat: false }));
  }, []);

  const connected = Boolean(health?.enabled);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect DevPulse with your tools
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Telegram
            </CardTitle>
            <CardDescription>
              Standups, project stats, and anomaly alerts via Telegram bot
            </CardDescription>
          </div>
          {connected ? (
            <Badge className="bg-green-500">
              <CheckCircle className="mr-1 h-3 w-3" /> Connected
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="mr-1 h-3 w-3" /> Not configured
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Configure the API with{" "}
              <code className="rounded bg-muted px-1">TELEGRAM_BOT_TOKEN</code>
              {", optional "}
              <code className="rounded bg-muted px-1">TELEGRAM_CHAT_ID</code>
              {" for push alerts, and point the bot webhook to "}
              <code className="rounded bg-muted px-1">
                POST /telegram/webhook
              </code>
              .
            </p>
            <p>Bot commands: /standup, /stats, /alert, /help</p>
          </div>

          {connected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <span className="text-sm">Bot token</span>
                <Badge>Active</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <span className="text-sm">Default chat for pushes</span>
                <Badge variant={health?.hasDefaultChat ? "default" : "secondary"}>
                  {health?.hasDefaultChat ? "Set" : "Optional"}
                </Badge>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
