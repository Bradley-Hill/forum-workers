import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qnhwsypwdmysgikqgmpm.supabase.co";

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const SUPABASE_SERVICE_ROLE_KEY = (globalThis as any).env
      ?.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables",
      );
    }
    supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    ) as SupabaseClient;
  }
  return supabaseClient;
}
