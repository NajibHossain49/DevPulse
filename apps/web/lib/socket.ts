import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

async function fetchSessionToken(): Promise<string> {
  try {
    const res = await fetch("/api/session-token", { credentials: "include" });
    if (!res.ok) return "";
    const data = (await res.json()) as { token?: string | null };
    return data.token ?? "";
  } catch {
    return "";
  }
}

export function getSocket(): Socket {
  if (socket) return socket;

  const base =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Create the client immediately; attach the session token as soon as the
  // same-origin helper returns it (httpOnly cookies are not readable in JS).
  socket = io(`${base}/events`, {
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: false,
    auth: { token: "" },
  });

  if (!connecting) {
    connecting = fetchSessionToken().then((token) => {
      if (socket) {
        socket.auth = { token };
        socket.connect();
      }
      connecting = null;
      return socket!;
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connecting = null;
}
