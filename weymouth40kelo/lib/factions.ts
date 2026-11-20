/**
 * URL-safe slug for a faction name, e.g. "Space Marines (Astartes)" →
 * "space-marines-astartes", "T'au Empire" → "tau-empire". Pure, so it's
 * shared by server pages and client components.
 */
export function factionSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function factionHref(name: string): string {
  return `/factions/${factionSlug(name)}`;
}
