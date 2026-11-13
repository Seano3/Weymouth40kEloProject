"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Public, unauthenticated self-registration. Deliberately scoped to only
 * flip visible false -> true (never hides, deletes, or edits anyone, and
 * never touches ratings) since there's no player login to verify identity.
 */
export async function registerAsPlayerAction(formData: FormData) {
  const playerId = String(formData.get("playerId") ?? "");
  if (!playerId) return;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("players")
    .update({ visible: true })
    .eq("id", playerId)
    .eq("visible", false)
    .select("display_name")
    .maybeSingle();
  if (error) throw error;

  revalidatePath("/register");
  updateTag("leaderboard");

  redirect(`/register?registered=${encodeURIComponent(data?.display_name ?? "")}`);
}
