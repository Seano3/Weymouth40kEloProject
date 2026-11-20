"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { syncEvent } from "@/lib/bcp/sync";
import { recomputeRatings } from "@/lib/elo";
import { createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/admin-token";
import { revalidatePath, updateTag } from "next/cache";
import {
  getKnownFactions,
  parseManualGame,
  playersAreRegistered,
  toGameRow,
} from "@/lib/manual-games";

function extractBcpEventId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/bestcoastpairings\.com\/event\/([a-zA-Z0-9]+)/);
  return match ? match[1] : trimmed;
}

export async function syncEventAction(formData: FormData) {
  await requireAdmin();

  const raw = String(formData.get("bcpEvent") ?? "");
  const bcpEventId = extractBcpEventId(raw);

  // redirect() works by throwing, so it must stay outside the try/catch or
  // the catch would turn every successful sync into an error message.
  let result: Awaited<ReturnType<typeof syncEvent>>;
  try {
    result = await syncEvent(bcpEventId);
  } catch (err) {
    redirect(
      `/admin?error=${encodeURIComponent(
        err instanceof Error ? err.message : "Sync failed"
      )}`
    );
  }

  // `synced` marks which event to show the green check next to.
  redirect(
    `/admin?synced=${encodeURIComponent(bcpEventId)}&message=${encodeURIComponent(
      `Synced "${result.eventName}": ${result.playersAdded} new players, ${result.gamesAdded} new games (${result.gamesSkipped} already synced), ${result.gamesWithFaction} with faction data.`
    )}`
  );
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

/**
 * Edits a manually added game. Scoped to source = 'manual' so BCP-synced
 * games can't be changed here (a re-sync would be the place for those).
 */
export async function updateManualGameAction(formData: FormData) {
  await requireAdmin();

  const gameId = String(formData.get("gameId") ?? "");
  const game = parseManualGame(formData, await getKnownFactions());
  if (typeof game === "string") {
    redirect(`/admin?error=${encodeURIComponent(game)}#manual-games`);
  }
  if (!(await playersAreRegistered([game.player1Id, game.player2Id]))) {
    redirect(
      `/admin?error=${encodeURIComponent("Both players must be registered on the leaderboard.")}#manual-games`
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("games")
    .update(toGameRow(game))
    .eq("id", gameId)
    .eq("source", "manual")
    .select("id");
  if (error) throw error;
  if (!data?.length) {
    redirect(`/admin?error=${encodeURIComponent("That game no longer exists.")}#manual-games`);
  }

  await recomputeRatings();
  revalidatePath("/admin");
  updateTag("leaderboard");
  redirect("/admin?message=Game+updated+and+ratings+recomputed.#manual-games");
}

export async function deleteManualGameAction(formData: FormData) {
  await requireAdmin();

  const gameId = String(formData.get("gameId") ?? "");
  const supabase = createServiceClient();
  // elo_history rows cascade with the game.
  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", gameId)
    .eq("source", "manual");
  if (error) throw error;

  await recomputeRatings();
  revalidatePath("/admin");
  updateTag("leaderboard");
  redirect("/admin?message=Game+deleted+and+ratings+recomputed.#manual-games");
}
