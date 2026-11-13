import "server-only";
import { cacheTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export type LeaderboardEntry = {
  id: string;
  displayName: string;
  eloRating: number;
  gamesPlayed: number;
  winRate: number;
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  "use cache";
  cacheTag("leaderboard");

  const supabase = createServiceClient();
  const { data: players, error } = await supabase
    .from("players")
    .select("id, display_name, elo_rating, games_played")
    .eq("visible", true)
    .order("elo_rating", { ascending: false });
  if (error) throw error;

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("player1_id, player2_id, player1_score, player2_score");
  if (gamesError) throw gamesError;

  const wins = new Map<string, number>();
  for (const g of games ?? []) {
    if (g.player1_score > g.player2_score) {
      wins.set(g.player1_id, (wins.get(g.player1_id) ?? 0) + 1);
    } else if (g.player2_score > g.player1_score) {
      wins.set(g.player2_id, (wins.get(g.player2_id) ?? 0) + 1);
    }
  }

  return (players ?? []).map((p) => ({
    id: p.id,
    displayName: p.display_name,
    eloRating: Math.round(p.elo_rating),
    gamesPlayed: p.games_played,
    winRate:
      p.games_played > 0
        ? Math.round(((wins.get(p.id) ?? 0) / p.games_played) * 1000) / 10
        : 0,
  }));
}

export type HiddenPlayer = {
  id: string;
  displayName: string;
};

export async function getHiddenPlayers(): Promise<HiddenPlayer[]> {
  "use cache";
  cacheTag("leaderboard");

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, display_name")
    .eq("visible", false)
    .order("display_name", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((p) => ({ id: p.id, displayName: p.display_name }));
}

export type RecentGame = {
  id: string;
  eventName: string;
  round: number;
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
};

const HIDDEN_PLAYER_NAME = "Hidden Player";

export async function getRecentGames(limit = 10): Promise<RecentGame[]> {
  "use cache";
  cacheTag("leaderboard");

  const supabase = createServiceClient();
  // games -> events is many-to-one, so PostgREST's foreignTable ordering
  // (which only reorders rows *within* a one-to-many embed) can't sort
  // games by their event's date — fetch the pool and sort in JS instead.
  const { data, error } = await supabase
    .from("games")
    .select(
      "id, round, player1_score, player2_score, events(name, event_date), player1:player1_id(display_name, visible), player2:player2_id(display_name, visible)"
    );
  if (error) throw error;

  const rows = (data ?? []).map((g) => {
    const row = g as unknown as {
      id: string;
      round: number;
      player1_score: number;
      player2_score: number;
      events: { name: string | null; event_date: string | null } | null;
      player1: { display_name: string; visible: boolean } | null;
      player2: { display_name: string; visible: boolean } | null;
    };
    return {
      id: row.id,
      eventName: row.events?.name ?? "Unknown event",
      eventDate: row.events?.event_date ?? "",
      round: row.round,
      player1Visible: row.player1?.visible ?? false,
      player2Visible: row.player2?.visible ?? false,
      player1Name: row.player1?.display_name ?? "Unknown",
      player2Name: row.player2?.display_name ?? "Unknown",
      player1Score: row.player1_score,
      player2Score: row.player2_score,
    };
  });

  return rows
    .filter((r) => r.player1Visible || r.player2Visible)
    .sort((a, b) => {
      if (a.eventDate !== b.eventDate) return a.eventDate < b.eventDate ? 1 : -1;
      return b.round - a.round;
    })
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      eventName: r.eventName,
      round: r.round,
      player1Name: r.player1Visible ? r.player1Name : HIDDEN_PLAYER_NAME,
      player2Name: r.player2Visible ? r.player2Name : HIDDEN_PLAYER_NAME,
      player1Score: r.player1Score,
      player2Score: r.player2Score,
    }));
}

export type PlayerMatch = {
  id: string;
  eventName: string;
  eventDate: string | null;
  round: number;
  opponentName: string;
  opponentEloBefore: number;
  result: "W" | "L" | "D";
  ownScore: number;
  opponentScore: number;
  delta: number;
  ratingAfter: number;
};

export type PlayerDetail = {
  id: string;
  displayName: string;
  eloRating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  matches: PlayerMatch[];
};

export async function getPlayerDetail(playerId: string): Promise<PlayerDetail | null> {
  "use cache";
  cacheTag("leaderboard");

  const supabase = createServiceClient();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, display_name, elo_rating, games_played, visible")
    .eq("id", playerId)
    .maybeSingle();
  if (playerError) throw playerError;
  if (!player || !player.visible) return null;

  const { data: ownHistory, error: historyError } = await supabase
    .from("elo_history")
    .select(
      "game_id, delta, rating_after, games(round, player1_id, player2_id, player1_score, player2_score, created_at, events(name, event_date))"
    )
    .eq("player_id", playerId);
  if (historyError) throw historyError;

  type OwnHistoryRow = {
    game_id: string;
    delta: number;
    rating_after: number;
    games: {
      round: number;
      player1_id: string;
      player2_id: string;
      player1_score: number;
      player2_score: number;
      created_at: string;
      events: { name: string | null; event_date: string | null } | null;
    } | null;
  };
  const rows = (ownHistory ?? []) as unknown as OwnHistoryRow[];

  const gameIds = rows.map((r) => r.game_id);
  const opponentIds = Array.from(
    new Set(
      rows.map((r) =>
        r.games!.player1_id === playerId ? r.games!.player2_id : r.games!.player1_id
      )
    )
  );

  const [{ data: opponentHistory, error: oppHistError }, { data: opponents, error: oppError }] =
    await Promise.all([
      supabase
        .from("elo_history")
        .select("game_id, player_id, rating_before")
        .in("game_id", gameIds.length > 0 ? gameIds : [""]),
      supabase
        .from("players")
        .select("id, display_name, visible")
        .in("id", opponentIds.length > 0 ? opponentIds : [""]),
    ]);
  if (oppHistError) throw oppHistError;
  if (oppError) throw oppError;

  const opponentRatingBefore = new Map<string, number>();
  for (const h of opponentHistory ?? []) {
    opponentRatingBefore.set(`${h.game_id}:${h.player_id}`, h.rating_before);
  }
  const opponentById = new Map(
    (opponents ?? []).map((o) => [o.id, { displayName: o.display_name, visible: o.visible }])
  );

  let wins = 0;
  let losses = 0;
  let draws = 0;

  const matches: PlayerMatch[] = [];

  const sorted = [...rows].sort((a, b) => {
    const dateA = a.games?.events?.event_date ?? "";
    const dateB = b.games?.events?.event_date ?? "";
    if (dateA !== dateB) return dateA < dateB ? -1 : 1;
    return (a.games?.round ?? 0) - (b.games?.round ?? 0);
  });

  for (const row of sorted) {
    const game = row.games!;
    const isPlayer1 = game.player1_id === playerId;
    const opponentId = isPlayer1 ? game.player2_id : game.player1_id;
    const ownScore = isPlayer1 ? game.player1_score : game.player2_score;
    const opponentScore = isPlayer1 ? game.player2_score : game.player1_score;

    if (ownScore > opponentScore) wins++;
    else if (ownScore < opponentScore) losses++;
    else draws++;

    const opponent = opponentById.get(opponentId);
    const opponentVisible = opponent?.visible ?? false;

    matches.push({
      id: row.game_id,
      eventName: game.events?.name ?? "Unknown event",
      eventDate: game.events?.event_date ?? null,
      round: game.round,
      opponentName: opponentVisible ? opponent!.displayName : HIDDEN_PLAYER_NAME,
      opponentEloBefore: Math.round(
        opponentRatingBefore.get(`${row.game_id}:${opponentId}`) ?? 1500
      ),
      result: ownScore > opponentScore ? "W" : ownScore < opponentScore ? "L" : "D",
      ownScore,
      opponentScore,
      delta: Math.round(row.delta * 10) / 10,
      ratingAfter: Math.round(row.rating_after),
    });
  }

  return {
    id: player.id,
    displayName: player.display_name,
    eloRating: Math.round(player.elo_rating),
    gamesPlayed: player.games_played,
    wins,
    losses,
    draws,
    matches,
  };
}
