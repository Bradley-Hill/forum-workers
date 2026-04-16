import { getSupabase } from "../db/supabase";

interface SignUpResponse {
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, any>;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

interface SignInResponse {
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  user: {
    id: string;
    email: string;
  };
}

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function supabaseSignUp(
  email: string,
  password: string,
  metadata?: Record<string, any>,
): Promise<SignUpResponse> {
  // Use standard signup which works in edge environments
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${(globalThis as any).env?.REDIRECT_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Failed to create user");
  }

  // Signup returns user but not always a session (depends on email confirmation settings)
  // For development with auto-confirm, we'll have a session
  return {
    user: {
      id: data.user.id,
      email: data.user.email || "",
      user_metadata: data.user.user_metadata || {},
    },
    session: {
      access_token: data.session?.access_token || "",
      refresh_token: data.session?.refresh_token || "",
      expires_in: data.session?.expires_in || 3600,
    },
  };
}

export async function supabaseSignIn(
  email: string,
  password: string,
): Promise<SignInResponse> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session || !data.user) {
    throw new Error("Login failed - no session created");
  }

  return {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token || "",
      expires_in: data.session.expires_in || 3600,
    },
    user: {
      id: data.user.id,
      email: data.user.email || "",
    },
  };
}

export async function supabaseRefreshToken(
  refreshToken: string,
): Promise<RefreshTokenResponse> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error("Token refresh failed - no session returned");
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token || refreshToken,
    expires_in: data.session.expires_in || 3600,
  };
}

export async function supabaseUpdatePassword(
  userId: string,
  newPassword: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}
