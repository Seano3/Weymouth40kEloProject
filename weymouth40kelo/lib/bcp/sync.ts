import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getBcpEvent,
  getBcpEventArmies,
  getBcpPairings,
  mapPairingToGame,
} from "@/lib/bcp/client";
import { recomputeRatings } from "@/lib/elo";
import { updateTag } from "next/cache";

export type SyncResult = {
  eventName: string;
  playersAdded: number;
  gamesAdded: number;
  gamesSkipped: number;
  gamesWithFaction: number;
};

/**
 * Pulls one BCP event's results into Supabase and recomputes ratings.
 * Idempotent: re-running on an already-synced event only adds new/changed
 * pairings (deduped on (event_id, bcp_pairing_id)). Faction columns are
 * refreshed on already-synced games too, so re-syncing backfills them.
 *
 * Callable from the manual admin Server Action today, and from a future
 * scheduled route handler without changes.
 */
export async function syncEvent(bcpEventId: string): Promise<SyncResult> {
  const supabase = createServiceClient();

  const bcpEvent = await getBcpEvent(bcpEventId);
  const [rawPairings, armies] = await Promise.all([
    getBcpPairings(bcpEventId, bcpEvent.numberOfRounds),
    getBcpEventArmies(bcpEventId),
  ]);
  const games = rawPairings
    .map((raw) => mapPairingToGame(raw, armies))
    .filter((g): g is NonNullable<typeof g> => g !== null);

  const { data: eventRow, error: eventError } = await supabase
    .from("events")
    .upsert(
      {
        bcp_event_id: bcpEvent.id,
        name: bcpEvent.name,
        event_date: bcpEvent.eventDate,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "bcp_event_id" }
    )
    .select("id")
    .single();
  if (eventError) throw eventError;

  let playersAdded = 0;
  const bcpIdToPlayerId = new Map<string, string>();

  for (const game of games) {
    for (const [bcpId, name] of [
      [game.player1BcpId, game.player1Name],
      [game.player2BcpId, game.player2Name],
    ] as const) {
      if (bcpIdToPlayerId.has(bcpId)) continue;

      const { data: existing } = await supabase
        .from("players")
        .select("id")
        .eq("bcp_user_id", bcpId)
        .maybeSingle();

      if (existing) {
        bcpIdToPlayerId.set(bcpId, existing.id);
        continue;
      }

      const { data: created, error: createError } = await supabase
        .from("players")
        .insert({ bcp_user_id: bcpId, display_name: name, visible: false })
        .select("id")
        .single();
      if (createError) throw createError;

      bcpIdToPlayerId.set(bcpId, created.id);
      playersAdded++;
    }
  }

  let gamesAdded = 0;
  let gamesSkipped = 0;
  let gamesWithFaction = 0;

  for (const game of games) {
    const player1Id = bcpIdToPlayerId.get(game.player1BcpId)!;
    const player2Id = bcpIdToPlayerId.get(game.player2BcpId)!;

    const factionFields = {
      player1_faction: game.player1Army.faction,
      player1_sub_faction: game.player1Army.subFaction,
      player2_faction: game.player2Army.faction,
      player2_sub_faction: game.player2Army.subFaction,
    };
    if (game.player1Army.faction || game.player2Army.faction) gamesWithFaction++;

    const { error: insertError } = await supabase.from("games").insert({
      event_id: eventRow.id,
      round: game.round,
      player1_id: player1Id,
      player2_id: player2Id,
      player1_score: game.player1Score,
      player2_score: game.player2Score,
      bcp_pairing_id: game.bcpPairingId,
      ...factionFields,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        // Already synced: leave scores alone, but refresh faction info.
        const { error: updateError } = await supabase
          .from("games")
          .update(factionFields)
          .eq("event_id", eventRow.id)
          .eq("bcp_pairing_id", game.bcpPairingId);
        if (updateError) throw updateError;
        gamesSkipped++;
        continue;
      }
      throw insertError;
    }
    gamesAdded++;
  }

  await recomputeRatings();
  updateTag("leaderboard");

  return {
    eventName: bcpEvent.name,
    playersAdded,
    gamesAdded,
    gamesSkipped,
    gamesWithFaction,
  };
}
