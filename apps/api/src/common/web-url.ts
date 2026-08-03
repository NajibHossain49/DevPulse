/** Primary frontend URL (Stripe redirects, email links). */
export function getWebUrl(): string {
  const raw = process.env.WEB_URL || "http://localhost:3000";
  return raw.split(",")[0]?.trim() || "http://localhost:3000";
}

/** Allowed browser origins for CORS / Socket.IO. */
export function getCorsOrigins(): string | string[] {
  const raw =
    process.env.CORS_ORIGINS ||
    process.env.WEB_URL ||
    "http://localhost:3000";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return "http://localhost:3000";
  return list.length === 1 ? list[0] : list;
}
