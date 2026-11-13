import "server-only";
import { createSessionClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!isAdminEmail(data.user?.email)) {
    throw new Error("Not authorized");
  }
  return data.user!;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
