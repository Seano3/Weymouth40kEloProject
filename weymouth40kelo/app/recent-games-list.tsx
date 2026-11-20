import Link from "next/link";
import type { RecentGame } from "@/lib/data";
import { factionHref } from "@/lib/factions";

/**
 * A list of results with each player's faction in small text under their
 * name. Used by the home page and faction pages. `currentFaction` is shown
 * in bold instead of linking to the page it's already on.
 */
export function RecentGamesList({
  games,
  currentFaction,
}: {
  games: (RecentGame & { eventDate?: string | null })[];
  currentFaction?: string;
}) {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {games.map((g) => (
        <li
          key={g.id}
          className="flex items-center justify-between rounded-md border border-black/5 px-3 py-2 dark:border-white/10"
        >
          <span className="flex items-start gap-2 text-black dark:text-zinc-50">
            <PlayerWithFaction
              name={g.player1Name}
              faction={g.player1Faction}
              currentFaction={currentFaction}
            />
            <span className="whitespace-nowrap">
              {g.player1Score} – {g.player2Score}
            </span>
            <PlayerWithFaction
              name={g.player2Name}
              faction={g.player2Faction}
              currentFaction={currentFaction}
            />
          </span>
          <span className="shrink-0 pl-3 text-right text-zinc-500 dark:text-zinc-400">
            {g.eventName}
            {g.round !== null && ` · R${g.round}`}
            {g.eventDate && (
              <span className="block text-xs text-zinc-400 dark:text-zinc-500">
                {g.eventDate}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PlayerWithFaction({
  name,
  faction,
  currentFaction,
}: {
  name: string;
  faction: string | null;
  currentFaction?: string;
}) {
  return (
    <span>
      {name}
      {faction && (
        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
          {faction === currentFaction ? (
            <span className="font-semibold text-black dark:text-zinc-50">{faction}</span>
          ) : (
            <Link href={factionHref(faction)} className="hover:underline">
              {faction}
            </Link>
          )}
        </span>
      )}
    </span>
  );
}
