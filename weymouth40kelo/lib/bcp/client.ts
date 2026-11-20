import "server-only";

const BCP_API_BASE = "https://newprod-api.bestcoastpairings.com/v1";
const CLIENT_ID = "web-app";

function headers(): Record<string, string> {
  return { "client-id": CLIENT_ID };
}

export type BcpEvent = {
  id: string;
  name: string;
  eventDate: string | null;
  numberOfRounds: number;
};

export async function getBcpEvent(bcpEventId: string): Promise<BcpEvent> {
  const res = await fetch(`${BCP_API_BASE}/events/${bcpEventId}`, {
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`BCP /events/${bcpEventId} failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return {
    id: bcpEventId,
    name: json.name,
    eventDate: json.eventDate ?? null,
    numberOfRounds: json.numberOfRounds,
  };
}

type RawPairingPlayer = {
  id: string; // event-player id, matches RawEventPlayer.id
  user: { id: string; firstName: string; lastName: string };
};

type RawPairing = {
  id: string;
  round: number;
  player1?: RawPairingPlayer;
  player2?: RawPairingPlayer;
  player1Game?: { points: number };
  player2Game?: { points: number };
};

/**
 * Verified against a real event (bestcoastpairings.com/event/QVq3oCA012Nw):
 * GET /events/{eventId}/pairings?eventId={eventId}&round={n}&pairingType=Pairing
 * Returns { active: Pairing[], deleted: Pairing[] } for that single round, no
 * auth required, no pagination needed (one round's pairings come back in one
 * response). "pairingType=Pairing" is the literal, case-sensitive value BCP's
 * own frontend uses — confirmed from a captured browser request, not guessed.
 */
export async function getBcpPairings(
  bcpEventId: string,
  numberOfRounds: number
): Promise<RawPairing[]> {
  const all: RawPairing[] = [];
  for (let round = 1; round <= numberOfRounds; round++) {
    const url = `${BCP_API_BASE}/events/${bcpEventId}/pairings?eventId=${encodeURIComponent(
      bcpEventId
    )}&round=${round}&pairingType=Pairing`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
      throw new Error(
        `BCP pairings failed for round ${round}: ${res.status} ${await res.text()}`
      );
    }
    const json = await res.json();
    all.push(...(json.active ?? []));
  }
  return all;
}

type RawEventPlayer = {
  id: string;
  faction?: { id: string; name: string } | null;
  subFaction?: { id: string; name: string } | null;
};

export type PlayerArmy = {
  faction: string | null;
  subFaction: string | null;
};

/**
 * Pairings don't carry army info, but the event's player list does.
 * GET /events/{eventId}/players?eventId={eventId}
 * Returns { active: EventPlayer[], deleted: EventPlayer[] } with `faction`
 * and `subFaction` set only when the player submitted a list (weekly events
 * often have gaps). Keyed by event-player id, which is what pairings use as
 * player1.id / player2.id.
 */
export async function getBcpEventArmies(
  bcpEventId: string
): Promise<Map<string, PlayerArmy>> {
  const url = `${BCP_API_BASE}/events/${bcpEventId}/players?eventId=${encodeURIComponent(
    bcpEventId
  )}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`BCP players failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  const players: RawEventPlayer[] = [...(json.active ?? []), ...(json.deleted ?? [])];
  return new Map(
    players.map((p) => [
      p.id,
      { faction: p.faction?.name ?? null, subFaction: p.subFaction?.name ?? null },
    ])
  );
}

export type MappedGame = {
  bcpPairingId: string;
  round: number;
  player1BcpId: string;
  player1Name: string;
  player2BcpId: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  player1Army: PlayerArmy;
  player2Army: PlayerArmy;
};

const NO_ARMY: PlayerArmy = { faction: null, subFaction: null };

function fullName(user: { firstName: string; lastName: string }): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown";
}

/**
 * Maps one raw pairing to our normalized shape. Returns null for byes
 * (missing opponent) or pairings with no recorded score yet — neither
 * should affect Elo.
 */
export function mapPairingToGame(
  raw: RawPairing,
  armies: Map<string, PlayerArmy>
): MappedGame | null {
  if (!raw.player1 || !raw.player2) return null;
  if (
    typeof raw.player1Game?.points !== "number" ||
    typeof raw.player2Game?.points !== "number"
  ) {
    return null;
  }

  return {
    bcpPairingId: raw.id,
    round: raw.round,
    player1BcpId: raw.player1.user.id,
    player1Name: fullName(raw.player1.user),
    player2BcpId: raw.player2.user.id,
    player2Name: fullName(raw.player2.user),
    player1Score: raw.player1Game.points,
    player2Score: raw.player2Game.points,
    player1Army: armies.get(raw.player1.id) ?? NO_ARMY,
    player2Army: armies.get(raw.player2.id) ?? NO_ARMY,
  };
}
