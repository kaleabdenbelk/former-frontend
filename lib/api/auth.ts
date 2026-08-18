import { apiFetch } from "./client";
import type { BetterAuthSessionResponse, SessionUser } from "./types";

/**
 * Better Auth endpoints on the backend origin. These use their own response
 * format (`{ message, code }` on errors), so `auth: false` keeps a failed
 * sign-in from triggering the global session-expired redirect.
 */

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  name?: string;
  email: string;
  password: string;
}

export async function signInEmail(input: SignInInput): Promise<void> {
  await apiFetch("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify(input),
  }, { auth: false });
}

export async function signUpEmail(input: SignUpInput): Promise<void> {
  await apiFetch("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify(input),
  }, { auth: false });
}

export async function signOutRequest(): Promise<void> {
  await apiFetch("/api/auth/sign-out", { method: "POST" }, { auth: false });
}

export async function getSession(): Promise<BetterAuthSessionResponse> {
  return apiFetch<BetterAuthSessionResponse>(
    "/api/auth/get-session",
    undefined,
    { auth: false },
  );
}

export async function currentUser(): Promise<SessionUser | null> {
  const res = await getSession();
  return res.user;
}
