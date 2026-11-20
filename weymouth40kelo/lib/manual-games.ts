import "server-only";
import { cacheTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { DISPOSITION_NAMES } from "@/lib/dispositions";

/** Battle points in 40k top out at 100. */
export const MAX_SCORE = 100;

export type ManualGameInput = {
  playedOn: string;
  player1Id: string;
  player2Id: string;
  player1Score: number;
  player2Score: number;
  player1Faction: string | null;
  player2Faction: string | null;
  player1SubFaction: string | null;
  player2SubFaction: string | null;
};

export type PickablePlayer = { id: string; displayName: string };

/** Registered (leaderboard-visible) players: the only ones a game can name. */
export async function getRegisteredPlayers(): Promise<PickablePlayer[]> {
  "use cache";
  cacheTag("leaderboard");

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, display_name")
    .eq("visible", true)
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => ({ id: p.id, displayName: p.display_name }));
}

/**
 * Factions seen in synced games, so manual games use BCP's exact spelling
 * and line up with the faction stats.
 */
export async function getKnownFactions(): Promise<string[]> {
  "use cache";
  cacheTag("leaderboard");

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("games")
    .select("player1_faction, player2_faction");
  if (error) throw error;

  const names = new Set<string>();
  for (const g of data ?? []) {
    if (g.player1_faction) names.add(g.player1_faction);
    if (g.player2_faction) names.add(g.player2_faction);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/**
 * Latest acceptable game date. One day past UTC "today" so a player whose
 * local date is already ahead of UTC isn't rejected; the form itself caps
 * the picker at the browser's local date.
 */
function latestPlayedOn(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function optional(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function parseScore(formData: FormData, key: string, label: string): number | string {
  const raw = String(formData.get(key) ?? "").trim();
  if (!/^\d+$/.test(raw)) return `${label} must be a whole number.`;
  const score = Number(raw);
  if (score > MAX_SCORE) return `${label} can't be more than ${MAX_SCORE}.`;
  return score;
}

/**
 * Validates a submitted game form. Returns the parsed game, or an error
 * message to show the user. Player visibility is checked separately since
 * it needs the database.
 */
export function parseManualGame(
  formData: FormData,
  knownFactions: string[]
): ManualGameInput | string {
  const playedOn = String(formData.get("playedOn") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(playedOn) || Number.isNaN(Date.parse(playedOn))) {
    return "Pick the date the game was played.";
  }
  if (playedOn > latestPlayedOn()) return "The game date can't be in the future.";

  const player1Id = String(formData.get("player1Id") ?? "");
  const player2Id = String(formData.get("player2Id") ?? "");
  if (!player1Id || !player2Id) return "Pick both players.";
  if (player1Id === player2Id) return "A player can't play against themselves.";

  const player1Score = parseScore(formData, "player1Score", "Player 1's score");
  if (typeof player1Score === "string") return player1Score;
  const player2Score = parseScore(formData, "player2Score", "Player 2's score");
  if (typeof player2Score === "string") return player2Score;

  const player1Faction = optional(formData, "player1Faction");
  const player2Faction = optional(formData, "player2Faction");
  for (const f of [player1Faction, player2Faction]) {
    if (f && !knownFactions.includes(f)) return `Unknown faction "${f}".`;
  }

  const player1SubFaction = optional(formData, "player1SubFaction");
  const player2SubFaction = optional(formData, "player2SubFaction");
  for (const d of [player1SubFaction, player2SubFaction]) {
    if (d && !DISPOSITION_NAMES.includes(d)) return `Unknown disposition "${d}".`;
  }

  return {
    playedOn,
    player1Id,
    player2Id,
    player1Score,
    player2Score,
    player1Faction,
    player2Faction,
    player1SubFaction,
    player2SubFaction,
  };
}

/** Both players must exist and be registered. */
export async function playersAreRegistered(ids: string[]): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .in("id", ids)
    .eq("visible", true);
  if (error) throw error;
  return (data ?? []).length === new Set(ids).size;
}

export function toGameRow(game: ManualGameInput) {
  return {
    played_on: game.playedOn,
    player1_id: game.player1Id,
    player2_id: game.player2Id,
    player1_score: game.player1Score,
    player2_score: game.player2Score,
    player1_faction: game.player1Faction,
    player2_faction: game.player2Faction,
    player1_sub_faction: game.player1SubFaction,
    player2_sub_faction: game.player2SubFaction,
  };
}

export type ManualGame = ManualGameInput & {
  id: string;
  player1Name: string;
  player2Name: string;
  createdAt: string;
};

/** Every manually added game, newest first, for the admin page. */
export async function listManualGames(): Promise<ManualGame[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("games")
    .select(
      "id, played_on, created_at, player1_id, player2_id, player1_score, player2_score, player1_faction, player2_faction, player1_sub_faction, player2_sub_faction, player1:player1_id(display_name), player2:player2_id(display_name)"
    )
    .eq("source", "manual")
    .order("played_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  type Row = {
    id: string;
    played_on: string;
    created_at: string;
    player1_id: string;
    player2_id: string;
    player1_score: number;
    player2_score: number;
    player1_faction: string | null;
    player2_faction: string | null;
    player1_sub_faction: string | null;
    player2_sub_faction: string | null;
    player1: { display_name: string } | null;
    player2: { display_name: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((g) => ({
    id: g.id,
    playedOn: g.played_on,
    createdAt: g.created_at,
    player1Id: g.player1_id,
    player2Id: g.player2_id,
    player1Name: g.player1?.display_name ?? "Unknown",
    player2Name: g.player2?.display_name ?? "Unknown",
    player1Score: g.player1_score,
    player2Score: g.player2_score,
    player1Faction: g.player1_faction,
    player2Faction: g.player2_faction,
    player1SubFaction: g.player1_sub_faction,
    player2SubFaction: g.player2_sub_faction,
  }));
}
