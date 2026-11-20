"use client";

import { useState } from "react";
import Link from "next/link";
import type { ArmyStat } from "@/lib/data";

type SortKey = "name" | "gamesPlayed" | "record" | "winRate";
type SortDir = "asc" | "desc";

/** Text sorts A→Z first; numbers sort highest first, like most stat tables. */
const DEFAULT_DIR: Record<SortKey, SortDir> = {
  name: "asc",
  gamesPlayed: "desc",
  record: "desc",
  winRate: "desc",
};

function compare(a: ArmyStat, b: ArmyStat, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "gamesPlayed":
      return a.gamesPlayed - b.gamesPlayed;
    case "record":
      return a.wins - b.wins || b.losses - a.losses;
    case "winRate":
      return (a.winRate ?? 0) - (b.winRate ?? 0);
  }
}

export function SortableStatsTable({
  title,
  column,
  rows,
  minGames,
}: {
  title: string;
  column: string;
  rows: ArmyStat[];
  minGames: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("gamesPlayed");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(DEFAULT_DIR[key]);
    }
  };

  const sign = sortDir === "asc" ? 1 : -1;
  const sorted = [...rows].sort((a, b) => {
    // Rows with no win rate (mirrors only) always sink to the bottom.
    if (sortKey === "winRate" && (a.winRate === null) !== (b.winRate === null)) {
      return a.winRate === null ? 1 : -1;
    }
    return (
      sign * compare(a, b, sortKey) ||
      b.gamesPlayed - a.gamesPlayed ||
      a.name.localeCompare(b.name)
    );
  });
  const maxShare = Math.max(0, ...rows.map((r) => r.playShare));

  const header = (key: SortKey, label: string, align: "left" | "right") => {
    const active = key === sortKey;
    return (
      <th
        key={key}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
        className={`py-2 pr-4 font-medium ${align === "right" ? "text-right" : ""} ${
          key === "winRate" ? "pr-0" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => onSort(key)}
          className={`inline-flex items-center gap-1 hover:text-black dark:hover:text-zinc-50 ${
            active ? "text-black dark:text-zinc-50" : ""
          }`}
        >
          {label}
          <span aria-hidden className={active ? "" : "invisible"}>
            {sortDir === "asc" ? "▲" : "▼"}
          </span>
        </button>
      </th>
    );
  };

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">{title}</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
            {header("name", column, "left")}
            {header("gamesPlayed", "Played", "right")}
            <th className="hidden py-2 pr-4 font-medium sm:table-cell">Share</th>
            {header("record", "W-L-D", "right")}
            {header("winRate", "Win Rate", "right")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.href ?? r.name} className="border-b border-black/5 dark:border-white/5">
              <td className="py-2 pr-4 font-medium text-black dark:text-zinc-50">
                {r.href ? (
                  <Link href={r.href} className="hover:underline">
                    {r.name}
                  </Link>
                ) : (
                  r.name
                )}
                {r.mirrors > 0 && (
                  <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    {r.mirrors} mirror{r.mirrors === 1 ? "" : "s"}
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 text-right text-black dark:text-zinc-50">
                {r.gamesPlayed}
              </td>
              <td className="hidden py-2 pr-4 sm:table-cell">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-black/5 dark:bg-white/10">
                    <div
                      className="h-2 rounded-full bg-zinc-800 dark:bg-zinc-200"
                      style={{ width: `${maxShare ? (r.playShare / maxShare) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-zinc-500 dark:text-zinc-400">{r.playShare}%</span>
                </div>
              </td>
              <td className="py-2 pr-4 text-right text-zinc-500 dark:text-zinc-400">
                {r.wins}-{r.losses}-{r.draws}
              </td>
              <td
                className={`py-2 text-right ${
                  r.wins + r.losses + r.draws < minGames
                    ? "text-zinc-400 dark:text-zinc-500"
                    : "text-black dark:text-zinc-50"
                }`}
              >
                {r.winRate === null ? "–" : `${r.winRate}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
