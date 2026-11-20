import { DISPOSITION_NAMES } from "@/lib/dispositions";
import { SearchableSelect } from "./searchable-select";

// Shared by the public add-game form (a client component) and the admin edit
// form (a server component), so it uses no hooks itself and imports nothing
// server-only; the searchable pickers are their own client component. Kept in sync with MAX_SCORE in lib/manual-games.ts.
const MAX_SCORE = 100;

export type GameFormDefaults = {
  playedOn?: string;
  player1Id?: string;
  player2Id?: string;
  player1Score?: number;
  player2Score?: number;
  player1Faction?: string | null;
  player2Faction?: string | null;
  player1SubFaction?: string | null;
  player2SubFaction?: string | null;
};

const inputClass =
  "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-black dark:border-white/15 dark:bg-black dark:text-zinc-50";
const labelClass = "flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400";

export function GameFormFields({
  players,
  factions,
  defaults = {},
}: {
  players: { id: string; displayName: string }[];
  factions: string[];
  defaults?: GameFormDefaults;
}) {
  return (
    <div className="flex flex-col gap-4">
      <label className={`${labelClass} sm:max-w-48`}>
        Date played
        <input
          type="date"
          name="playedOn"
          required
          defaultValue={defaults.playedOn}
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        {([1, 2] as const).map((n) => (
          <fieldset
            key={n}
            className="flex flex-col gap-3 rounded-md border border-black/10 p-4 dark:border-white/10"
          >
            <legend className="px-1 text-sm font-semibold text-black dark:text-zinc-50">
              Player {n}
            </legend>
            <label className={labelClass}>
              Player
              <SearchableSelect
                name={`player${n}Id`}
                required
                options={players.map((p) => ({ value: p.id, label: p.displayName }))}
                defaultValue={defaults[`player${n}Id`]}
                placeholder="Type to search players…"
                inputClassName={inputClass}
              />
            </label>
            <label className={labelClass}>
              Score
              <input
                type="number"
                name={`player${n}Score`}
                required
                min={0}
                max={MAX_SCORE}
                step={1}
                inputMode="numeric"
                defaultValue={defaults[`player${n}Score`]}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Faction (optional)
              <SearchableSelect
                name={`player${n}Faction`}
                options={factions.map((f) => ({ value: f, label: f }))}
                defaultValue={defaults[`player${n}Faction`]}
                placeholder="Not recorded · type to search"
                emptyLabel="Not recorded"
                inputClassName={inputClass}
              />
            </label>
            <label className={labelClass}>
              Disposition (optional)
              <select
                name={`player${n}SubFaction`}
                defaultValue={defaults[`player${n}SubFaction`] ?? ""}
                className={inputClass}
              >
                <option value="">Not recorded</option>
                {DISPOSITION_NAMES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
