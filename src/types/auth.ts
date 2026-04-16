export interface AuthTokenPayload {
  id: string;
  username: string;
  role: "member" | "admin";
  issuedAt?: number;
  expiresAt?: number;
}
