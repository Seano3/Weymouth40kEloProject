"use client";

import { useFormStatus } from "react-dom";

/** Re-sync button that shows progress while its form's action runs. */
export function ResyncButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="text-xs text-zinc-500 underline disabled:no-underline">
      {pending ? "Syncing…" : "Re-sync"}
    </button>
  );
}
