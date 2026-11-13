// Shared by proxy.ts and server code, so no "server-only" import here.

export const ADMIN_COOKIE = "admin_session";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Cookie value proving the admin PIN was entered. Derived from ADMIN_PIN so
 * changing the PIN invalidates every existing session.
 */
export async function expectedAdminToken(): Promise<string | null> {
  const pin = process.env.ADMIN_PIN;
  if (!pin) return null;
  const bytes = new TextEncoder().encode(`weymouth40kelo-admin:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

export async function isValidAdminToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const expected = await expectedAdminToken();
  return expected !== null && token === expected;
}
