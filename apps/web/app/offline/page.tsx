export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="max-w-md text-muted-foreground">
        DevPulse can&apos;t reach the network right now. Reconnect to continue
        tracking your engineering metrics.
      </p>
    </main>
  );
}
