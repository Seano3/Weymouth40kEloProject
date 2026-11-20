import type { Metadata } from "next";
import Link from "next/link";
import { getKnownFactions, getRegisteredPlayers } from "@/lib/manual-games";
import { AddGameForm } from "./add-game-form";

export const metadata: Metadata = {
  title: "Add a Game · Weymouth 40k Elo",
  description: "Record a game played outside a BCP event.",
};

export default async function AddGamePage() {
  const [players, factions] = await Promise.all([
    getRegisteredPlayers(),
    getKnownFactions(),
  ]);

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-6 py-16 px-6">
        <div>
          <Link href="/" className="text-sm text-zinc-500 underline dark:text-zinc-400">
            ← Leaderboard
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Add a Game
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Record a game played outside a BCP event. It counts toward Elo and
            faction stats as soon as it&apos;s added. Only registered players can
            be picked.{" "}
            <Link href="/register" className="underline">
              Not listed? Register here.
            </Link>
          </p>
        </div>

        {players.length < 2 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            At least two registered players are needed to add a game.
          </p>
        ) : (
          <AddGameForm players={players} factions={factions} />
        )}
      </main>
    </div>
  );
}
