import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qnhwsypwdmysgikqgmpm.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =(globalThis as any).env?.SUPABASE_SERVICE_ROLE_KEY;

if(!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);