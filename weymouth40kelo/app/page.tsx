import Link from "next/link";
import { getLeaderboard, getRecentGames } from "@/lib/data";

export default async function Home() {
  const [leaderboard, recentGames] = await Promise.all([
    getLeaderboard(),
    getRecentGames(),
  ]);

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-10 py-16 px-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Weymouth 40k Battlegound Games and Hobbies Elo Leaderboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            
          </p>
        </div>

        <section>
          {leaderboard.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">
              No results yet — check back after the next event is synced.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Player</th>
                  <th className="py-2 pr-4 font-medium text-right">Elo</th>
                  <th className="py-2 pr-4 font-medium text-right">Games</th>
                  <th className="py-2 pr-4 font-medium text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((p, i) => (
                  <tr
                    key={p.id}
                    className="border-b border-black/5 dark:border-white/5"
                  >
                    <td className="py-2 pr-4 text-zinc-500 dark:text-zinc-400">
                      {i + 1}
                    </td>
                    <td className="py-2 pr-4 font-medium text-black dark:text-zinc-50">
                      <Link href={`/players/${p.id}`} className="hover:underline">
                        {p.displayName}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-right text-black dark:text-zinc-50">
                      {p.eloRating}
                    </td>
                    <td className="py-2 pr-4 text-right text-zinc-500 dark:text-zinc-400">
                      {p.gamesPlayed}
                    </td>
                    <td className="py-2 pr-4 text-right text-zinc-500 dark:text-zinc-400">
                      {p.winRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {recentGames.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">
              Recent Results
            </h2>
            <ul className="flex flex-col gap-2 text-sm">
              {recentGames.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between rounded-md border border-black/5 px-3 py-2 dark:border-white/10"
                >
                  <span className="text-black dark:text-zinc-50">
                    {g.player1Name} {g.player1Score} – {g.player2Score}{" "}
                    {g.player2Name}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {g.eventName} · R{g.round}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex justify-center">
          <Link
            href="/register"
            className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium text-black hover:bg-black/5 dark:border-white/15 dark:text-zinc-50 dark:hover:bg-white/5"
          >
            Don&apos;t see your name? Register here
          </Link>
        </div>
      </main>
    </div>
  );
}
