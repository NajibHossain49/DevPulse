"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, CheckCircle, XCircle } from "lucide-react";

export default function IntegrationsPage() {
  const [slackToken, setSlackToken] = useState("");
  const [slackConnected, setSlackConnected] = useState(false);

  function connectSlack() {
    if (!slackToken.trim()) {
      toast.error("Enter a Slack bot token first");
      return;
    }
    // Real deployments would run an OAuth flow; this demo just marks it active.
    toast.success("Slack connected! (Demo mode)");
    setSlackConnected(true);
  }

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
              <MessageSquare className="h-5 w-5" />
              Slack
            </CardTitle>
            <CardDescription>
              Post standups and alerts to Slack channels
            </CardDescription>
          </div>
          {slackConnected ? (
            <Badge className="bg-green-500">
              <CheckCircle className="mr-1 h-3 w-3" /> Connected
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="mr-1 h-3 w-3" /> Not connected
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!slackConnected ? (
            <>
              <div className="space-y-2">
                <Label>Slack Bot Token</Label>
                <Input
                  type="password"
                  placeholder="xoxb-..."
                  value={slackToken}
                  onChange={(e) => setSlackToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Create a Slack app at api.slack.com/apps and install it to
                  your workspace. Add the token to the API as
                  <code className="mx-1">SLACK_BOT_TOKEN</code>.
                </p>
              </div>
              <Button onClick={connectSlack}>Connect Slack</Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <span className="text-sm">Daily standup reminders</span>
                <Badge>Active</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <span className="text-sm">Anomaly alerts</span>
                <Badge>Active</Badge>
              </div>
              <Button
                variant="outline"
                onClick={() => setSlackConnected(false)}
              >
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
