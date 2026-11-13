import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Full-access client for all app data (players/events/games/elo_history).
 * Never expose the service role key to the browser.
 */
export function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

