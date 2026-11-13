"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { syncEvent } from "@/lib/bcp/sync";
import { recomputeRatings } from "@/lib/elo";
import { createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/admin-token";
import { revalidatePath, updateTag } from "next/cache";

function extractBcpEventId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/bestcoastpairings\.com\/event\/([a-zA-Z0-9]+)/);
  return match ? match[1] : trimmed;
}

export async function syncEventAction(formData: FormData) {
  await requireAdmin();

  const raw = String(formData.get("bcpEvent") ?? "");
  const bcpEventId = extractBcpEventId(raw);

  try {
    const result = await syncEvent(bcpEventId);
    redirect(
      `/admin?message=${encodeURIComponent(
        `Synced "${result.eventName}": ${result.playersAdded} new players, ${result.gamesAdded} new games (${result.gamesSkipped} already synced).`
      )}`
    );
  } catch (err) {
    redirect(
      `/admin?error=${encodeURIComponent(
        err instanceof Error ? err.message : "Sync failed"
      )}`
    );
  }
}

export async function toggleVisibilityAction(formData: FormData) {
  await requireAdmin();

  const playerId = String(formData.get("playerId") ?? "");
  const visible = formData.get("visible") === "true";

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("players")
    .update({ visible })
    .eq("id", playerId);
  if (error) throw error;

  revalidatePath("/admin");
  updateTag("leaderboard");
}

export async function recomputeRatingsAction() {
  await requireAdmin();
  await recomputeRatings();
  revalidatePath("/admin");
  updateTag("leaderboard");
  redirect("/admin?message=Ratings+recomputed.");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
