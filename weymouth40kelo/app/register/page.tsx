import { Suspense } from "react";
import Link from "next/link";
import { getHiddenPlayers } from "@/lib/data";
import RegisterSearch from "./register-search";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const players = await getHiddenPlayers();

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-6 py-16 px-6">
        <div>
          <Link
            href="/"
            className="text-sm text-zinc-500 underline dark:text-zinc-400"
          >
            ← Leaderboard
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Register
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Find your name below and select yourself to appear on the public
            leaderboard. 
          </p>
        </div>

        <Suspense fallback={null}>
          <RegisteredBanner searchParamsPromise={searchParams} />
        </Suspense>

        <RegisterSearch players={players} />
      </main>
    </div>
  );
}

async function RegisteredBanner({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ registered?: string }>;
}) {
  const { registered } = await searchParamsPromise;
  if (!registered) return null;

  return (
    <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
      You&apos;re on the leaderboard now, {registered}!
    </p>
  );
}
