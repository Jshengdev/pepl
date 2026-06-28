// The demo's userId, persisted in localStorage so a refresh keeps the same node. Defaults to
// NEXT_PUBLIC_DEMO_USER_ID ?? "johnny" so the flow works without live OAuth (HANDOFF.md §5).
const KEY = "pepl.userId";
// The demo node to enter as when skipping live OAuth (SCOPE-LOCK cut on-stage OAuth).
// "johnny" is a real persisted node, so the demo path works even with the env unset.
export const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "johnny";
const DEFAULT_USER_ID = DEMO_USER_ID;

export function getUserId(): string {
  if (typeof window === "undefined") return DEFAULT_USER_ID; // SSR: no localStorage
  const stored = window.localStorage.getItem(KEY);
  if (stored) return stored;
  window.localStorage.setItem(KEY, DEFAULT_USER_ID);
  return DEFAULT_USER_ID;
}

export function setUserId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, id);
}
