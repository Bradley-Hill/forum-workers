import { Context, Next } from "hono";
import { generateCSRFToken } from "../utils/auth";
import { setCookie, parseCookies } from "./authenticate";
import { Variables } from "../types/context";

export async function csrf(
  c: Context<{ Variables: Variables }>,
  next: Next,
): Promise<void> {
  const method = c.req.method;
  const path = c.req.path;
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (safeMethods.includes(method)) {
    await next();
    return;
  }

  const exemptPaths = ["/auth/login", "/auth/register", "/auth/refresh"];
  if (exemptPaths.includes(path)) {
    await next();
    return;
  }

  const cookieHeader = c.req.header("cookie");
  const headerToken = c.req.header("x-csrf-token");

  if (!headerToken) {
    return c.json(
      {
        error: {
          message: "CSRF token missing from header",
          code: "CSRF_TOKEN_MISSING",
        },
      },
      403,
    );
  }

  const cookies = parseCookies(cookieHeader || "");
  const cookieToken = cookies.csrfToken;

  if (!cookieToken) {
    return c.json(
      {
        error: {
          message: "CSRF token missing from cookie",
          code: "CSRF_TOKEN_MISSING",
        },
      },
      403,
    );
  }

  if (headerToken !== cookieToken) {
    return c.json(
      {
        error: {
          message: "CSRF token validation failed",
          code: "CSRF_TOKEN_INVALID",
        },
      },
      403,
    );
  }

  await next();
}
