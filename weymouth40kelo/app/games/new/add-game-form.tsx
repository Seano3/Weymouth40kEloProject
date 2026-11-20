"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { GameFormFields } from "../game-form-fields";
import { addGameAction, type AddGameState } from "./actions";

function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function AddGameForm({
  players,
  factions,
}: {
  players: { id: string; displayName: string }[];
  factions: string[];
}) {
  const [state, formAction, pending] = useActionState<AddGameState, FormData>(
    addGameAction,
    { status: "idle" }
  );
  const formRef = useRef<HTMLFormElement>(null);

  // React resets the form after every submission, so re-apply the date
  // default (the browser's local "today") whenever the form is blank. This
  // runs in the browser, so it's the player's date, not the server's.
  useEffect(() => {
    const date = formRef.current?.elements.namedItem("playedOn");
    if (date instanceof HTMLInputElement) {
      const today = localToday();
      date.max = today;
      if (!date.value) date.value = today;
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      {state.status === "success" && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
          {state.message}{" "}
          <Link href="/" className="underline">
            View leaderboard
          </Link>
        </p>
      )}
      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.message}
        </p>
      )}

      <GameFormFields
        // Remount after every submission: blank after a success, refilled
        // with what was entered after an error. React's own form reset
        // doesn't reach the searchable pickers' internal state.
        key={state.status === "idle" ? "idle" : state.submissionId}
        players={players}
        factions={factions}
        defaults={state.status === "error" ? state.values : undefined}
      />

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Saving…" : "Add game"}
        </button>
      </div>
    </form>
  );
}
