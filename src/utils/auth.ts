import { AuthTokenPayload } from "../types/auth";

const JWT_ACCESS_SECRET = (globalThis as any).env?.JWT_ACCESS_SECRET || "dev-secret-key";

export function generateCSRFToken(): string {
  const bytes = (globalThis as any).crypto.getRandomValues(new Uint8Array(16));
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export function generateRefreshToken(): string {
  const bytes = (globalThis as any).crypto.getRandomValues(new Uint8Array(16));
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export async function generateAccessToken(payload: Omit<AuthTokenPayload, "issuedAt" | "expiresAt">): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600;
  const exp = now + expiresIn;

  const header = { alg: "HS256", typ: "JWT" };
  const tokenPayload = {
    ...payload,
    issuedAt: now,
    exp,
  };

  const headerEncoded = encodeBase64Url(JSON.stringify(header));
  const payloadEncoded = encodeBase64Url(JSON.stringify(tokenPayload));
  const messageToSign = `${headerEncoded}.${payloadEncoded}`;
  const signature = await signJWTHS256(messageToSign, JWT_ACCESS_SECRET);

  return `${messageToSign}.${signature}`;
}

export async function verifyAccessToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerEncoded, payloadEncoded, signature] = parts;
    
    const payload = JSON.parse(decodeBase64(payloadEncoded));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    const expectedSignature = await signJWTHS256(
      `${headerEncoded}.${payloadEncoded}`,
      JWT_ACCESS_SECRET
    );

    if (signature !== expectedSignature) return null;

    return payload as AuthTokenPayload;
  } catch (error) {
    return null;
  }
}

export function decodeBase64(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(padding);
  return (globalThis as any).atob(padded);
}

export function encodeBase64Url(str: string): string {
  const base64 = (globalThis as any).btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function signJWTHS256(data: string, secret: string): Promise<string> {
  try {
    const encoder = new (globalThis as any).TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const key = await (globalThis as any).crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await (globalThis as any).crypto.subtle.sign("HMAC", key, messageData);

    const uint8Array = new Uint8Array(signature);
    let binaryString = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64 = (globalThis as any).btoa(binaryString);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  } catch (error) {
    throw new Error("JWT signature generation failed");
  }
}
