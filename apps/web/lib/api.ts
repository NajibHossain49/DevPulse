/**
 * Browser calls go through the same-origin BFF (`/api/backend/*`) so Better Auth
 * cookies stay on the Vercel host and are forwarded to the Nest API as Bearer.
 * Server-side calls hit the Nest API directly.
 */
function getApiBase(): string {
  if (typeof window !== "undefined") {
    return "/api/backend";
  }
  return (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001"
  );
}

export async function apiFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${getApiBase()}${normalized}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: "GET" });
  if (!res.ok) {
    throw new Error(`GET ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `POST ${path} failed with ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: "DELETE" });
  if (!res.ok) {
    let message = `DELETE ${path} failed with ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

// The Nest API wraps every success response as { success, data }.
// These helpers unwrap it for convenience.
export async function apiGetData<T>(path: string): Promise<T> {
  const res = await apiGet<Envelope<T>>(path);
  return res.data;
}

export async function apiPostData<T>(path: string, body: unknown): Promise<T> {
  const res = await apiPost<Envelope<T>>(path, body);
  return res.data;
}

export async function apiDeleteData<T>(path: string): Promise<T> {
  const res = await apiDelete<Envelope<T>>(path);
  return res.data;
}
