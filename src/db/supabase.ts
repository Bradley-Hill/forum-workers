import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qnhwsypwdmysgikqgmpm.supabase.co";

export function getSupabase(): SupabaseClient {
  const SUPABASE_SERVICE_ROLE_KEY = (globalThis as any)
    .SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables",
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as SupabaseClient;
}
