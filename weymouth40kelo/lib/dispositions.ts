/**
 * All 11th edition Force Dispositions, in matrix order. The names match what
 * BCP reports as a player's `subFaction`, except Disruption, which nobody has
 * played in a synced event yet, so BCP's exact spelling is unconfirmed. The
 * prefix lets a BCP name replace the canonical one if its spelling differs.
 */
export const DISPOSITIONS: [prefix: string, name: string][] = [
  ["Priority", "Priority Assets"],
  ["Take", "Take and Hold"],
  ["Recon", "Reconnaissance"],
  ["Disrupt", "Disruption"],
  ["Purge", "Purge the Foe"],
];

export const DISPOSITION_NAMES = DISPOSITIONS.map(([, name]) => name);

/**
 * Every canonical disposition (using BCP's spelling where one has been seen),
 * followed by any unrecognised names, so new dispositions still show up.
 */
export function orderDispositions(seen: string[]): string[] {
  const names = DISPOSITIONS.map(
    ([prefix, name]) => seen.find((s) => s.startsWith(prefix)) ?? name
  );
  const extras = seen.filter((s) => !names.includes(s)).sort();
  return [...names, ...extras];
}
