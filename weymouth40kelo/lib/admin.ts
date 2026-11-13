import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-token";

export async function requireAdmin() {
  const cookieStore = await cookies();
  if (!(await isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value))) {
    throw new Error("Not authorized");
  }
}
