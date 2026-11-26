/** Shared fetch helpers: JSON errors become ApiError, and a 401 anywhere sends the user to the login page. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const UNAUTHORIZED_EVENT = "warden:unauthorized";

export async function readError(res: Response): Promise<string> {
  let detail = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    const d = body?.detail;
    if (typeof d === "string") detail = d;
    else if (Array.isArray(d) && d[0]?.msg) detail = String(d[0].msg).replace(/^Value error, /, "");
    else if (d) detail = JSON.stringify(d);
  } catch {
    /* non-JSON body */
  }
  return detail;
}

export async function request<T>(url: string, init?: RequestInit & { raw?: "text" }): Promise<T> {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin", ...init });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !url.includes("/auth/login")) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(res.status, await readError(res));
  }
  if (res.status === 204) return undefined as T;
  return (init?.raw === "text" ? res.text() : res.json()) as Promise<T>;
}

export function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}
