"use client";

import { useState } from "react";
import { registerAsPlayerAction } from "./actions";
import type { HiddenPlayer } from "@/lib/data";

const MIN_QUERY_LENGTH = 3;

export default function RegisterSearch({ players }: { players: HiddenPlayer[] }) {
  const [query, setQuery] = useState("");
  const searchReady = query.trim().length >= MIN_QUERY_LENGTH;
  const filtered = searchReady
    ? players.filter((p) => p.displayName.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your name…"
        className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black"
      />

      {players.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Everyone synced so far is already on the leaderboard.
        </p>
      ) : !searchReady ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Search through tracked games
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No match — if you don&apos;t see your name, you may already be on
          the leaderboard, or haven&apos;t played in a synced event yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-md border border-black/5 px-3 py-2 dark:border-white/10"
            >
              <span className="text-black dark:text-zinc-50">
                {p.displayName}
              </span>
              <form action={registerAsPlayerAction}>
                <input type="hidden" name="playerId" value={p.id} />
                <button
                  type="submit"
                  className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-black"
                >
                  This is me
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
