import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

export const STARTING_RATING = 1500;
export const K_FACTOR = 32;

export function computeEloUpdate({
  ratingA,
  ratingB,
  scoreA,
  scoreB,
  kFactor = K_FACTOR,
}: {
  ratingA: number;
  ratingB: number;
  scoreA: number;
  scoreB: number;
  kFactor?: number;
}): { deltaA: number; deltaB: number } {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const total = scoreA + scoreB;
  const actualA = total === 0 ? 0.5 : scoreA / total;

  const deltaA = kFactor * (actualA - expectedA);
  return { deltaA, deltaB: -deltaA };
}

type GameRow = {
  id: string;
  round: number | null;
  played_on: string | null;
  created_at: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  events: { event_date: string | null } | null;
};

/**
 * Event games are dated by their event and ordered by round; manually added
 * games are dated by when they were played and, on a shared date, come after
 * that day's event rounds, in the order they were entered.
 */
export function compareGamesChronologically(
  a: Pick<GameRow, "round" | "played_on" | "created_at" | "events">,
  b: Pick<GameRow, "round" | "played_on" | "created_at" | "events">
): number {
  const dateA = a.events?.event_date ?? a.played_on ?? "";
  const dateB = b.events?.event_date ?? b.played_on ?? "";
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  const roundA = a.round ?? Number.MAX_SAFE_INTEGER;
  const roundB = b.round ?? Number.MAX_SAFE_INTEGER;
  if (roundA !== roundB) return roundA - roundB;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/**
 * Rebuilds elo_history and players.elo_rating/games_played from scratch by
 * replaying every game in chronological order. Run after every sync so
 * ratings stay correct regardless of import order or re-synced corrections.
 */
export async function recomputeRatings() {
  const supabase = createServiceClient();

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select(
      "id, round, played_on, created_at, player1_id, player2_id, player1_score, player2_score, events(event_date)"
    )
    .returns<GameRow[]>();
  if (gamesError) throw gamesError;

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id");
  if (playersError) throw playersError;

  const sorted = [...(games ?? [])].sort(compareGamesChronologically);

  const ratings = new Map<string, number>();
  const gamesPlayed = new Map<string, number>();
  for (const p of players ?? []) {
    ratings.set(p.id, STARTING_RATING);
    gamesPlayed.set(p.id, 0);
  }

  const historyRows: {
    game_id: string;
    player_id: string;
    rating_before: number;
    rating_after: number;
    delta: number;
  }[] = [];

  for (const game of sorted) {
    const ratingA = ratings.get(game.player1_id) ?? STARTING_RATING;
    const ratingB = ratings.get(game.player2_id) ?? STARTING_RATING;
    const { deltaA, deltaB } = computeEloUpdate({
      ratingA,
      ratingB,
      scoreA: game.player1_score,
      scoreB: game.player2_score,
    });

    const ratingAAfter = ratingA + deltaA;
    const ratingBAfter = ratingB + deltaB;

    ratings.set(game.player1_id, ratingAAfter);
    ratings.set(game.player2_id, ratingBAfter);
    gamesPlayed.set(game.player1_id, (gamesPlayed.get(game.player1_id) ?? 0) + 1);
    gamesPlayed.set(game.player2_id, (gamesPlayed.get(game.player2_id) ?? 0) + 1);

    historyRows.push(
      {
        game_id: game.id,
        player_id: game.player1_id,
        rating_before: ratingA,
        rating_after: ratingAAfter,
        delta: deltaA,
      },
      {
        game_id: game.id,
        player_id: game.player2_id,
        rating_before: ratingB,
        rating_after: ratingBAfter,
        delta: deltaB,
      }
    );
  }

  const { error: deleteError } = await supabase
    .from("elo_history")
    .delete()
    .not("id", "is", null);
  if (deleteError) throw deleteError;

  if (historyRows.length > 0) {
    const { error: insertError } = await supabase
      .from("elo_history")
      .insert(historyRows);
    if (insertError) throw insertError;
  }

  for (const [playerId, rating] of ratings.entries()) {
    const { error: updateError } = await supabase
      .from("players")
      .update({
        elo_rating: rating,
        games_played: gamesPlayed.get(playerId) ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", playerId);
    if (updateError) throw updateError;
  }
}
