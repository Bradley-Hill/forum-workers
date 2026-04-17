import { getSupabase } from "../db/supabase";
import { User, PublicUser, RegisteredUser, MeUser } from "../types/user";

export async function findUserByEmail(email: string): Promise<User | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, password_hash, role, created_at, avatar_url")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;

  return data as User | null;
}

export async function findUserByUsername(
  username: string,
): Promise<PublicUser | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, created_at, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (error) throw error;

  return data as PublicUser | null;
}

export async function createUser(
  username: string,
  email: string,
): Promise<RegisteredUser> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .insert({
      username,
      email,
      role: "member",
    })
    .select("id, username, email, role")
    .single();

  if (error) throw error;
  return data as RegisteredUser;
}

export async function createRefreshToken(
  userId: string,
  token: string,
  expiresAt: Date,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("refresh_tokens").insert({
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw error;
}

export async function deleteRefreshToken(token: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("refresh_tokens")
    .delete()
    .eq("token", token);

  if (error) throw error;
}

export async function findRefreshToken(
  token: string,
): Promise<{ user_id: string; expires_at: string } | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("refresh_tokens")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error) throw error;

  return data as { user_id: string; expires_at: string } | null;
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, created_at, avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data as PublicUser | null;
}

export async function updateUser(
  userId: string,
  fields: { email?: string; password_hash?: string; avatar_url?: string },
): Promise<RegisteredUser> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .update(fields)
    .eq("id", userId)
    .select("id, username, email, role")
    .single();

  if (error) throw error;
  return data as RegisteredUser;
}

export async function findUserWithHashById(id: string): Promise<User | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, password_hash, role, created_at, avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data as User | null;
}

export async function findMeById(id: string): Promise<MeUser | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, role, created_at, avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data as MeUser | null;
}

export async function deleteUser(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("users").delete().eq("id", userId);

  if (error) throw error;
}
