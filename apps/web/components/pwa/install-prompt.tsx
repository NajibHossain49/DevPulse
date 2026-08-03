"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "devpulse.pwa.installPrompt";
/** After dismiss, wait this long before showing again (3 hours). */
const DISMISS_COOLDOWN_MS = 3 * 60 * 60 * 1000;

type StoredPromptState =
  | { status: "dismissed"; until: number }
  | { status: "installed" };

function readStoredState(): StoredPromptState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPromptState;
  } catch {
    return null;
  }
}

function writeStoredState(state: StoredPromptState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

function shouldSuppressPrompt(): boolean {
  if (typeof window === "undefined") return true;

  // Already running as installed PWA
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone) {
    return true;
  }

  const stored = readStoredState();
  if (!stored) return false;
  if (stored.status === "installed") return true;
  if (stored.status === "dismissed" && Date.now() < stored.until) return true;
  return false;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (shouldSuppressPrompt()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      if (shouldSuppressPrompt()) return;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    writeStoredState({
      status: "dismissed",
      until: Date.now() + DISMISS_COOLDOWN_MS,
    });
    setShowPrompt(false);
    setDeferredPrompt(null);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      writeStoredState({ status: "installed" });
    } else {
      writeStoredState({
        status: "dismissed",
        until: Date.now() + DISMISS_COOLDOWN_MS,
      });
    }
    setShowPrompt(false);
    setDeferredPrompt(null);
  }

  if (!showPrompt) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Install DevPulse</p>
            <p className="text-sm text-muted-foreground">
              Add to your home screen for quick access
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={install}>
            Install
          </Button>
          <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
