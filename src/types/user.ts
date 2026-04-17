export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: "member" | "admin";
  created_at: string;
  avatar_url?: string;
}

export interface PublicUser {
  id: string;
  username: string;
  role: "member" | "admin";
  created_at: string;
  avatar_url?: string;
}

export interface RegisteredUser {
  id: string;
  username: string;
  email: string;
  role: "member" | "admin";
}

export interface MeUser {
  id: string;
  username: string;
  email: string;
  role: "member" | "admin";
  created_at: string;
  avatar_url?: string;
  auth_id: string;
}
