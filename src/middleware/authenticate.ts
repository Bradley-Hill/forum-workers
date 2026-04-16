import { Context, Next } from "hono";
import { verifyAccessToken } from "../utils/auth";
import { AuthTokenPayload } from "../types/auth";
import { Variables } from "../types/context";

export async function authenticate(
  c: Context<{ Variables: Variables }>,
  next: Next,
): Promise<void> {
  try {
    const cookieHeader = c.req.header("cookie");
    if (!cookieHeader) {
      return await next();
    }

    const cookies = parseCookies(cookieHeader);
    const accessToken = cookies.accessToken;

    if (!accessToken) {
      return await next();
    }

    const user = await verifyAccessToken(accessToken);
    if (!user) {
      return await next();
    }

    c.set("user", user);
    await next();
  } catch (error) {
    await next();
  }
}

export async function requireAuth(
  c: Context<{ Variables: Variables }>,
  next: Next,
): Promise<void> {
  const user = c.get("user") as AuthTokenPayload | undefined;

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
}

export async function requireAdmin(
  c: Context<{ Variables: Variables }>,
  next: Next,
): Promise<void> {
  const user = c.get("user") as AuthTokenPayload | undefined;

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
}

export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split("; ").forEach((cookie) => {
    const [name, value] = cookie.split("=");
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

export function setCookie(
  c: Context,
  name: string,
  value: string,
  options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    maxAge?: number;
    path?: string;
  },
): void {
  const opts = {
    httpOnly: options?.httpOnly ?? true,
    secure: options?.secure ?? true,
    sameSite: options?.sameSite ?? "Strict",
    maxAge: options?.maxAge,
    path: options?.path ?? "/",
  };

  let cookieString = `${name}=${encodeURIComponent(value)}`;
  cookieString += `; Path=${opts.path}`;
  cookieString += `; SameSite=${opts.sameSite}`;
  if (opts.secure) cookieString += "; Secure";
  if (opts.httpOnly) cookieString += "; HttpOnly";
  if (opts.maxAge) cookieString += `; Max-Age=${opts.maxAge}`;

  c.header("Set-Cookie", cookieString, { append: true });
}

export function clearCookie(c: Context, name: string): void {
  setCookie(c, name, "", { maxAge: 0 });
}
