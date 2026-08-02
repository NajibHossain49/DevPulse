import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function readSessionToken(): string {
  if (typeof document === "undefined") return "";
  const cookies = document.cookie.split(";").map((c) => c.trim());
  const match = cookies.find(
    (c) =>
      c.startsWith("better-auth.session_token=") ||
      c.startsWith("__Secure-better-auth.session_token=") ||
      c.startsWith("session="),
  );
  if (!match) return "";
  const value = decodeURIComponent(match.split("=").slice(1).join("="));
  // Better Auth signs the cookie as "<token>.<signature>"; the API validates
  // against the raw token.
  return value.split(".")[0];
}

export function getSocket(): Socket {
  if (!socket) {
    const base =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    // The gateway lives on the "/events" namespace (default Socket.IO path),
    // and Better Auth cookies are httpOnly, so we rely on withCredentials to
    // forward the session cookie on the handshake.
    socket = io(`${base}/events`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: {
        token: readSessionToken(),
      },
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
