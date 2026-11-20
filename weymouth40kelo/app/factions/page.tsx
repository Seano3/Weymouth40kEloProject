import type { Metadata } from "next";
import Link from "next/link";
import { getFactionStats, type FactionStat } from "@/lib/data";

export const metadata: Metadata = {
  title: "Faction Stats · Weymouth 40k Elo",
  description: "Win rate and play rate by faction across synced Weymouth 40k games.",
};

/** Below this many decided games a win rate is too noisy to headline. */
const MIN_GAMES = 5;

export default async function FactionsPage() {
  const { factions, gamesWithFaction, totalGames } = await getFactionStats();

  const mostPlayed = factions[0];
  const bestWinRate = factions
    .filter((f) => f.winRate !== null && decided(f) >= MIN_GAMES)
    .sort((a, b) => b.winRate! - a.winRate! || b.gamesPlayed - a.gamesPlayed)[0];
  const maxShare = mostPlayed?.playShare ?? 0;

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-8 py-16 px-6">
        <Link href="/" className="text-sm text-zinc-500 underline dark:text-zinc-400">
          ← Leaderboard
        </Link>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Faction Stats
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Faction data from {gamesWithFaction} of {totalGames} games. It only appears
            when a player submits a list on BCP.
          </p>
        </div>

        {factions.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            No faction data yet. It&apos;ll show up here once events are synced with
            army lists.
          </p>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2">
              <Highlight
                label="Most played"
                faction={mostPlayed.faction}
                detail={`Played ${mostPlayed.gamesPlayed} times · ${mostPlayed.playShare}% of armies`}
              />
              {bestWinRate ? (
                <Highlight
                  label={`Best win rate (${MIN_GAMES}+ games)`}
                  faction={bestWinRate.faction}
                  detail={`${bestWinRate.winRate}% · ${record(bestWinRate)}`}
                />
              ) : (
                <Highlight
                  label="Best win rate"
                  faction="Not enough games"
                  detail={`No faction has ${MIN_GAMES}+ games yet`}
                />
              )}
            </section>

            <section>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                    <th className="py-2 pr-4 font-medium">Faction</th>
                    <th className="py-2 pr-4 font-medium text-right">Played</th>
                    <th className="hidden py-2 pr-4 font-medium sm:table-cell">Share</th>
                    <th className="py-2 pr-4 font-medium text-right">W-L-D</th>
                    <th className="py-2 font-medium text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {factions.map((f) => {
                    const lowSample = decided(f) < MIN_GAMES;
                    return (
                      <tr key={f.faction} className="border-b border-black/5 dark:border-white/5">
                        <td className="py-2 pr-4 font-medium text-black dark:text-zinc-50">
                          {f.faction}
                          {f.mirrors > 0 && (
                            <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                              {f.mirrors} mirror{f.mirrors === 1 ? "" : "s"}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right text-black dark:text-zinc-50">
                          {f.gamesPlayed}
                        </td>
                        <td className="hidden py-2 pr-4 sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-black/5 dark:bg-white/10">
                              <div
                                className="h-2 rounded-full bg-zinc-800 dark:bg-zinc-200"
                                style={{ width: `${(f.playShare / maxShare) * 100}%` }}
                              />
                            </div>
                            <span className="text-zinc-500 dark:text-zinc-400">
                              {f.playShare}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-right text-zinc-500 dark:text-zinc-400">
                          {record(f)}
                        </td>
                        <td
                          className={`py-2 text-right ${
                            lowSample
                              ? "text-zinc-400 dark:text-zinc-500"
                              : "text-black dark:text-zinc-50"
                          }`}
                        >
                          {f.winRate === null ? "–" : `${f.winRate}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Played counts each army taken to a game, so a mirror match counts
                twice. Win rate leaves out mirror matches and counts draws as
                non-wins. Greyed win rates are from fewer than {MIN_GAMES} games.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function decided(f: FactionStat): number {
  return f.wins + f.losses + f.draws;
}

function record(f: FactionStat): string {
  return `${f.wins}-${f.losses}-${f.draws}`;
}

function Highlight({
  label,
  faction,
  detail,
}: {
  label: string;
  faction: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-black/5 px-4 py-3 dark:border-white/10">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-black dark:text-zinc-50">{faction}</div>
      <div className="text-sm text-zinc-500 dark:text-zinc-400">{detail}</div>
    </div>
  );
}
