import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFactionDetail } from "@/lib/data";
import { RecentGamesList } from "@/app/recent-games-list";
import { SortableStatsTable } from "../sortable-stats-table";

/** Matches the faction page: below this, win rates are greyed as noisy. */
const MIN_GAMES = 5;

export default function FactionPage({ params }: PageProps<"/factions/[faction]">) {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-8 py-16 px-6">
        <Link href="/factions" className="text-sm text-zinc-500 underline dark:text-zinc-400">
          ← Faction Stats
        </Link>
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <FactionContent paramsPromise={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function FactionContent({
  paramsPromise,
}: {
  paramsPromise: PageProps<"/factions/[faction]">["params"];
}) {
  const { faction: slug } = await paramsPromise;
  const faction = await getFactionDetail(slug);
  if (!faction) notFound();

  const { overall } = faction;
  const decided = overall.wins + overall.losses + overall.draws;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        {faction.name}
      </h1>

      <section className="flex flex-wrap gap-8 text-sm">
        <Stat value={overall.gamesPlayed} label="Times Played" />
        <Stat value={`${overall.playShare}%`} label="Of All Armies" />
        <Stat value={`${overall.wins}-${overall.losses}-${overall.draws}`} label="W-L-D" />
        <Stat
          value={overall.winRate === null ? "–" : `${overall.winRate}%`}
          label={decided < MIN_GAMES ? `Win Rate (under ${MIN_GAMES} games)` : "Win Rate"}
        />
      </section>

      <div>
        {faction.players.length === 0 ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">
              Top Players
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No registered players have used this faction yet.
            </p>
          </section>
        ) : (
          <SortableStatsTable
            title="Top Players"
            column="Player"
            rows={faction.players}
            minGames={0}
          />
        )}
        {faction.unregisteredAppearances > 0 && (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Plus {faction.unregisteredAppearances} game
            {faction.unregisteredAppearances === 1 ? "" : "s"} by players who
            aren&apos;t on the leaderboard.
          </p>
        )}
      </div>

      {faction.dispositions.length > 0 && (
        <SortableStatsTable
          title="Dispositions"
          column="Disposition"
          rows={faction.dispositions}
          minGames={MIN_GAMES}
        />
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">
          Recent Games
        </h2>
        <RecentGamesList games={faction.recentGames} currentFaction={faction.name} />
      </section>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Mirror matches (this faction on both sides) count toward times played but
        not the faction&apos;s win rate. Under Top Players they count normally,
        since each player either won or lost.
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold text-black dark:text-zinc-50">{value}</div>
      <div className="text-zinc-500 dark:text-zinc-400">{label}</div>
    </div>
  );
}
