"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  expectedAdminToken,
} from "@/lib/admin-token";

export async function loginAction(formData: FormData) {
  const pin = String(formData.get("pin") ?? "").trim();

  if (!process.env.ADMIN_PIN) {
    redirect(`/admin/login?error=${encodeURIComponent("ADMIN_PIN is not set on the server.")}`);
  }
  if (pin !== process.env.ADMIN_PIN) {
    redirect(`/admin/login?error=${encodeURIComponent("Incorrect PIN.")}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, (await expectedAdminToken())!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });

  redirect("/admin");
}
