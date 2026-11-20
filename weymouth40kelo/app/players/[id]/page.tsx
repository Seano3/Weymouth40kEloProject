import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerDetail } from "@/lib/data";
import { SortableStatsTable } from "@/app/factions/sortable-stats-table";

export default function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-8 py-16 px-6">
        <Link
          href="/"
          className="text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          ← Leaderboard
        </Link>
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <PlayerContent paramsPromise={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function PlayerContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id } = await paramsPromise;
  const player = await getPlayerDetail(id);
  if (!player) notFound();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        {player.displayName}
      </h1>

      <section className="flex gap-8 text-sm">
        <div>
          <div className="text-2xl font-semibold text-black dark:text-zinc-50">
            {player.eloRating}
          </div>
          <div className="text-zinc-500 dark:text-zinc-400">Elo Rating</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-black dark:text-zinc-50">
            {player.wins}-{player.losses}-{player.draws}
          </div>
          <div className="text-zinc-500 dark:text-zinc-400">W-L-D</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-black dark:text-zinc-50">
            {player.gamesPlayed}
          </div>
          <div className="text-zinc-500 dark:text-zinc-400">Games Played</div>
        </div>
      </section>

      {player.factions.length > 0 && (
        <div>
          <SortableStatsTable
            title="By Faction"
            column="Faction"
            rows={player.factions}
            minGames={0}
          />
          {player.gamesWithoutFaction > 0 && (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              {player.gamesWithoutFaction} game
              {player.gamesWithoutFaction === 1 ? " has" : "s have"} no faction data,
              because no list was submitted on BCP.
            </p>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">
          Match History
        </h2>
        {player.matches.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No visible match history yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Event / Round</th>
                  <th className="py-2 pr-4 font-medium">Faction</th>
                  <th className="py-2 pr-4 font-medium">Opponent</th>
                  <th className="py-2 pr-4 font-medium text-right">Opp Elo</th>
                  <th className="py-2 pr-4 font-medium text-center">Result</th>
                  <th className="py-2 pr-4 font-medium text-right">Score</th>
                  <th className="py-2 pr-4 font-medium text-right">Δ</th>
                  <th className="py-2 pr-4 font-medium text-right">New Rating</th>
                </tr>
              </thead>
              <tbody>
                {player.matches.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-black/5 dark:border-white/5"
                  >
                    <td className="py-2 pr-4 text-zinc-500 dark:text-zinc-400">
                      {m.eventName} · R{m.round}
                      {m.eventDate && (
                        <span className="block text-xs text-zinc-400 dark:text-zinc-500">
                          {m.eventDate}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-zinc-500 dark:text-zinc-400">
                      {m.faction ?? "–"}
                    </td>
                    <td className="py-2 pr-4 text-black dark:text-zinc-50">
                      {m.opponentName}
                      {m.opponentFaction && (
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                          {m.opponentFaction}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right text-zinc-500 dark:text-zinc-400">
                      {m.opponentEloBefore}
                    </td>
                    <td className="py-2 pr-4 text-center font-medium text-black dark:text-zinc-50">
                      {m.result}
                    </td>
                    <td className="py-2 pr-4 text-right text-zinc-500 dark:text-zinc-400">
                      {m.ownScore}–{m.opponentScore}
                    </td>
                    <td
                      className={`py-2 pr-4 text-right ${
                        m.delta > 0
                          ? "text-green-600 dark:text-green-400"
                          : m.delta < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-zinc-500"
                      }`}
                    >
                      {m.delta > 0 ? "+" : ""}
                      {m.delta}
                    </td>
                    <td className="py-2 pr-4 text-right text-black dark:text-zinc-50">
                      {m.ratingAfter}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
