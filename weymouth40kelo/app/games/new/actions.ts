"use server";

import { updateTag } from "next/cache";
import { recomputeRatings } from "@/lib/elo";
import {
  getKnownFactions,
  parseManualGame,
  playersAreRegistered,
  toGameRow,
} from "@/lib/manual-games";
import { createServiceClient } from "@/lib/supabase/server";
import type { GameFormDefaults } from "../game-form-fields";

/** `submissionId` is unique per submission, so the form can remount on each. */
export type AddGameState =
  | { status: "idle" }
  | { status: "error"; submissionId: string; message: string; values: GameFormDefaults }
  | { status: "success"; submissionId: string; message: string };

function submittedValues(formData: FormData): GameFormDefaults {
  const get = (key: string) => String(formData.get(key) ?? "");
  const score = (key: string) => {
    const n = Number(get(key));
    return get(key) === "" || Number.isNaN(n) ? undefined : n;
  };
  return {
    playedOn: get("playedOn"),
    player1Id: get("player1Id"),
    player2Id: get("player2Id"),
    player1Score: score("player1Score"),
    player2Score: score("player2Score"),
    player1Faction: get("player1Faction"),
    player2Faction: get("player2Faction"),
    player1SubFaction: get("player1SubFaction"),
    player2SubFaction: get("player2SubFaction"),
  };
}

/**
 * Public, unauthenticated: there's no player login, so the game counts
 * immediately and the admin page is where bad submissions get fixed or
 * removed. Limited to registered players, and always saved as a manual game
 * so it can never alter BCP-synced results.
 */
export async function addGameAction(
  _prev: AddGameState,
  formData: FormData
): Promise<AddGameState> {
  const fail = (message: string): AddGameState => ({
    status: "error",
    submissionId: crypto.randomUUID(),
    message,
    values: submittedValues(formData),
  });

  const game = parseManualGame(formData, await getKnownFactions());
  if (typeof game === "string") return fail(game);

  if (!(await playersAreRegistered([game.player1Id, game.player2Id]))) {
    return fail("Both players must be registered on the leaderboard.");
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("games")
    .insert({ source: "manual", ...toGameRow(game) });
  if (error) {
    console.error("Failed to add manual game", error);
    return fail("Couldn't save the game. Please try again.");
  }

  await recomputeRatings();
  updateTag("leaderboard");

  return {
    status: "success",
    submissionId: crypto.randomUUID(),
    message: `Game added: ${game.player1Score}–${game.player2Score}. Ratings have been updated.`,
  };
}
