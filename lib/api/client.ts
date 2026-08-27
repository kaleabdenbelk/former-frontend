/**
 * Thin typed fetch wrapper for the Fieldbase backend.
 *
 * All management + auth calls go straight from the browser to the backend
 * origin with `credentials: "include"` (HttpOnly session cookies) — the
 * backend's CORS configuration only allows the dashboard origin with
 * credentials, so no proxy is involved.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Cap on any single backend request. Without this, a hung backend (or a
 * boot-time session check that never resolves) leaves the UI stuck on its
 * loading state indefinitely.
 */
const REQUEST_TIMEOUT_MS = 10_000;

export function apiUrl(path: string) {
  return `${API_URL}${path}`;
}

/** Error with a user-safe message extracted from the API error envelope. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Turn an unknown thrown value into a user-safe message. */
export function errorMessage(err: unknown): string {
  // Better Auth / management envelope error with a message.
  if (err instanceof ApiError) {
    if (err.status === 500) return "The server hit an unexpected error. Please try again in a moment.";
    if (err.status === 503) return "The service is temporarily unavailable. Please try again shortly.";
    if (err.status === 429) return "Too many requests. Please wait a moment and try again.";
    return err.message;
  }
  if (err instanceof Error) {
    // AbortController timeout.
    if (err.name === "AbortError" || err.name === "TimeoutError")
      return "The request took too long — the server may be down. Please try again.";
    // Fetch network failure (DNS, CORS, offline, backend not running).
    if (
      err.name === "TypeError" &&
      /failed to fetch|network|cors|load/i.test(err.message)
    )
      return "Could not reach the server. Make sure it's running and try again.";
    if (err.message) return err.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Extract a human-readable message from any API error body:
 * - management envelope: `{ error: { code, message } }`
 * - Better Auth errors:  `{ code, message }`
 */
function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const err = b.error;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string" && e.message) return e.message;
  }
  if (typeof b.message === "string" && b.message) return b.message;
  return null;
}

function extractCode(body: unknown, status: number): string {
  if (!body || typeof body !== "object") return String(status);
  const b = body as Record<string, unknown>;
  const err = b.error;
  if (err && typeof err === "object" && typeof (err as Record<string, unknown>).code === "string") {
    return (err as Record<string, unknown>).code as string;
  }
  if (typeof b.code === "string") return b.code;
  return String(status);
}

let unauthorizedHandler: (() => void) | null = null;

/**
 * Register a global handler for 401 responses on management endpoints
 * (session expired). The store provider wires this to a redirect to /sign-in.
 */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

export interface RequestOptions {
  /**
   * Whether a 401 should trigger the global unauthorized handler. Auth
   * endpoints (sign-in etc.) legitimately return 401, so they pass `false`.
   * Defaults to `true`.
   */
  auth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: RequestOptions,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal,
    });

  const contentType = res.headers.get("content-type") ?? "";
  let body: unknown = null;
  if (contentType.includes("application/json")) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  }

    if (!res.ok) {
      const message =
        extractMessage(body) ?? `Request failed with status ${res.status}.`;
      if (res.status === 401 && options?.auth !== false) {
        unauthorizedHandler?.();
      }
      throw new ApiError(res.status, extractCode(body, res.status), message);
    }

    return body as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Convenience: JSON request body + method. */
export function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}
