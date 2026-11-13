import { createServiceClient } from "@/lib/supabase/server";
import {
  syncEventAction,
  toggleVisibilityAction,
  recomputeRatingsAction,
  logoutAction,
} from "./actions";

export const instant = false;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const supabase = createServiceClient();

  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, elo_rating, games_played, visible")
    .order("elo_rating", { ascending: false });

  const { data: events } = await supabase
    .from("events")
    .select("id, bcp_event_id, name, event_date, synced_at")
    .order("synced_at", { ascending: false });

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-8 py-12 px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Admin
          </h1>
          <form action={logoutAction}>
            <button className="text-sm text-zinc-500 underline dark:text-zinc-400">
              Log out
            </button>
          </form>
        </div>

        {message && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Sync a BCP event
          </h2>
          <form action={syncEventAction} className="flex gap-2">
            <input
              name="bcpEvent"
              placeholder="BCP event URL or ID"
              required
              className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black"
            />
            <button
              type="submit"
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Sync
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Synced events
          </h2>
          {!events?.length ? (
            <p className="text-sm text-zinc-500">No events synced yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-md border border-black/5 px-3 py-2 dark:border-white/10"
                >
                  <span className="text-black dark:text-zinc-50">
                    {e.name ?? e.bcp_event_id}
                    {e.event_date ? ` · ${e.event_date}` : ""}
                  </span>
                  <form action={syncEventAction}>
                    <input type="hidden" name="bcpEvent" value={e.bcp_event_id} />
                    <button className="text-xs text-zinc-500 underline">
                      Re-sync
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Players
          </h2>
          <form action={recomputeRatingsAction}>
            <button className="text-xs text-zinc-500 underline">
              Recompute all ratings
            </button>
          </form>
          {!players?.length ? (
            <p className="text-sm text-zinc-500">No players yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-zinc-500 dark:border-white/10">
                  <th className="py-2 pr-4 font-medium">Player</th>
                  <th className="py-2 pr-4 font-medium text-right">Elo</th>
                  <th className="py-2 pr-4 font-medium text-right">Games</th>
                  <th className="py-2 pr-4 font-medium text-right">
                    Visible on leaderboard
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-black/5 dark:border-white/5"
                  >
                    <td className="py-2 pr-4 text-black dark:text-zinc-50">
                      {p.display_name}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {Math.round(p.elo_rating)}
                    </td>
                    <td className="py-2 pr-4 text-right">{p.games_played}</td>
                    <td className="py-2 pr-4 text-right">
                      <form action={toggleVisibilityAction}>
                        <input type="hidden" name="playerId" value={p.id} />
                        <input
                          type="hidden"
                          name="visible"
                          value={(!p.visible).toString()}
                        />
                        <button className="text-xs underline">
                          {p.visible ? "Hide" : "Show"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
