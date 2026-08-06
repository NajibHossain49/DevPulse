/** Extract the Better Auth session token from a Cookie header. */
export function sessionTokenFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf("=");
    if (index > -1) {
      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      if (key) acc[key] = value;
    }
    return acc;
  }, {});

  const raw =
    cookies["session"] ||
    cookies["better-auth.session_token"] ||
    cookies["__Secure-better-auth.session_token"];

  if (!raw) return null;

  // Better Auth cookies are signed as `<token>.<signature>`; Nest validates the raw token.
  return decodeURIComponent(raw).split(".")[0] || null;
}
