import type { Metadata } from "next";
import Link from "next/link";
import {
  getFactionStats,
  type ArmyStat,
  type DispositionMatchups,
  type MatchupRecord,
} from "@/lib/data";
import { SortableStatsTable } from "./sortable-stats-table";

export const metadata: Metadata = {
  title: "Faction Stats · Weymouth 40k Elo",
  description:
    "Win rate and play rate by faction and disposition across synced Weymouth 40k games.",
};

/** Below this many decided games a win rate is too noisy to headline. */
const MIN_GAMES = 5;

export default async function FactionsPage() {
  const { factions, dispositions, dispositionMatchups, gamesWithFaction, totalGames } =
    await getFactionStats();

  const mostPlayed = factions[0];
  const bestWinRate = factions
    .filter((f) => f.winRate !== null && decided(f) >= MIN_GAMES)
    .sort((a, b) => b.winRate! - a.winRate! || b.gamesPlayed - a.gamesPlayed)[0];

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
                name={mostPlayed.name}
                detail={`Played ${mostPlayed.gamesPlayed} times · ${mostPlayed.playShare}% of armies`}
              />
              {bestWinRate ? (
                <Highlight
                  label={`Best win rate (${MIN_GAMES}+ games)`}
                  name={bestWinRate.name}
                  detail={`${bestWinRate.winRate}% · ${record(bestWinRate)}`}
                />
              ) : (
                <Highlight
                  label="Best win rate"
                  name="Not enough games"
                  detail={`No faction has ${MIN_GAMES}+ games yet`}
                />
              )}
            </section>

            <SortableStatsTable
              title="By Faction"
              column="Faction"
              rows={factions}
              minGames={MIN_GAMES}
            />

            {dispositions.length > 0 && (
              <DispositionMatrix matchups={dispositionMatchups} overall={dispositions} />
            )}

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Played counts each army taken to a game, so a mirror match counts twice.
              Win rate leaves out mirror matches and counts draws as non-wins. Greyed
              win rates are from fewer than {MIN_GAMES} games.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

/**
 * Column order and short labels for known dispositions, matched by name
 * prefix. Anything BCP adds later is appended under its full name.
 */
const DISPOSITION_ORDER: [prefix: string, label: string][] = [
  ["Priority", "Prio"],
  ["Take", "Take"],
  ["Recon", "Recon"],
  ["Disrupt", "Disrupt"],
  ["Purge", "Purge"],
];

function orderDispositions(names: string[]): { name: string; label: string }[] {
  const rank = (name: string) => {
    const i = DISPOSITION_ORDER.findIndex(([prefix]) => name.startsWith(prefix));
    return i === -1 ? DISPOSITION_ORDER.length : i;
  };
  return [...names]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((name) => ({
      name,
      label: DISPOSITION_ORDER.find(([prefix]) => name.startsWith(prefix))?.[1] ?? name,
    }));
}

/** Green above 50%, red below, stronger the further from even. */
function winRateTint(winRate: number, games: number): string | undefined {
  if (games < MIN_GAMES) return undefined;
  const strength = (Math.abs(winRate - 50) / 50) * 0.35;
  return winRate >= 50
    ? `rgba(16, 185, 129, ${strength})`
    : `rgba(244, 63, 94, ${strength})`;
}

function DispositionMatrix({
  matchups,
  overall,
}: {
  matchups: DispositionMatchups;
  overall: ArmyStat[];
}) {
  const cols = orderDispositions(matchups.names);
  const overallByName = new Map(overall.map((o) => [o.name, o]));
  const cellClass = "border border-black/5 px-2 py-2 text-center dark:border-white/10";

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold text-black dark:text-zinc-50">
        Disposition Matchups
      </h2>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        Each column&apos;s win rate against the disposition in each row.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-zinc-500 dark:text-zinc-400">
              <th className="px-2 py-2 text-left text-xs font-medium">vs ↓ / as →</th>
              {cols.map((c) => (
                <th key={c.name} title={c.name} className="px-2 py-2 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map((row) => (
              <tr key={row.name}>
                <th
                  scope="row"
                  title={row.name}
                  className="px-2 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400"
                >
                  {row.label}
                </th>
                {cols.map((col) =>
                  col.name === row.name ? (
                    <td
                      key={col.name}
                      className={`${cellClass} bg-black/[0.03] text-xs text-zinc-400 dark:bg-white/[0.04] dark:text-zinc-500`}
                    >
                      Mirror
                      <div>{matchups.mirrors[col.name] ?? 0} games</div>
                    </td>
                  ) : (
                    <MatrixCell
                      key={col.name}
                      className={cellClass}
                      record={matchups.cells[col.name]?.[row.name]}
                    />
                  )
                )}
              </tr>
            ))}
            <tr>
              <th
                scope="row"
                className="px-2 py-2 text-left font-semibold text-black dark:text-zinc-50"
              >
                Overall
              </th>
              {cols.map((col) => {
                const o = overallByName.get(col.name);
                return (
                  <MatrixCell
                    key={col.name}
                    className={`${cellClass} border-t-2 border-t-black/15 font-semibold dark:border-t-white/20`}
                    record={o}
                  />
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MatrixCell({
  record,
  className,
}: {
  record: MatchupRecord | undefined;
  className: string;
}) {
  const games = record ? record.wins + record.losses + record.draws : 0;
  if (!record || games === 0) {
    return <td className={`${className} text-zinc-400 dark:text-zinc-500`}>–</td>;
  }
  const winRate = Math.round((record.wins / games) * 1000) / 10;
  const lowSample = games < MIN_GAMES;
  return (
    <td
      className={className}
      style={{ backgroundColor: winRateTint(winRate, games) }}
      title={`${record.wins}-${record.losses}-${record.draws}`}
    >
      <div
        className={
          lowSample ? "text-zinc-400 dark:text-zinc-500" : "text-black dark:text-zinc-50"
        }
      >
        {winRate}%
      </div>
      <div className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
        {games} game{games === 1 ? "" : "s"}
      </div>
    </td>
  );
}

function decided(r: ArmyStat): number {
  return r.wins + r.losses + r.draws;
}

function record(r: ArmyStat): string {
  return `${r.wins}-${r.losses}-${r.draws}`;
}

function Highlight({
  label,
  name,
  detail,
}: {
  label: string;
  name: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-black/5 px-4 py-3 dark:border-white/10">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-black dark:text-zinc-50">{name}</div>
      <div className="text-sm text-zinc-500 dark:text-zinc-400">{detail}</div>
    </div>
  );
}
