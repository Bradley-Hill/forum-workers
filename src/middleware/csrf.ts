import { Context, Next } from "hono";
import { generateCSRFToken } from "../utils/auth";
import { setCookie, parseCookies } from "./authenticate";
import { Variables } from "../types/context";

export async function csrf(c: Context<{ Variables: Variables }>, next: Next): Promise<void> {
  const method = c.req.method;
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (safeMethods.includes(method)) {
    const csrfToken = generateCSRFToken();
    setCookie(c, "csrfToken", csrfToken, {
      httpOnly: false, 
      secure: true,
      sameSite: "Lax",
      maxAge: 3600,
    });
    c.set("csrfToken", csrfToken);
    await next();
  } else {
    const cookieHeader = c.req.header("cookie");
    const headerToken = c.req.header("x-csrf-token");

    if (!headerToken) {
      return c.json({ error: "CSRF token missing from header" }, 403);
    }

    const cookies = parseCookies(cookieHeader || "");
    const cookieToken = cookies.csrfToken;

    if (!cookieToken) {
      return c.json({ error: "CSRF token missing from cookie" }, 403);
    }

    if (headerToken !== cookieToken) {
      return c.json({ error: "CSRF token validation failed" }, 403);
    }

    await next();
  }
}
