import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { jsonError, jsonErrorFromUnknown } from "../../errors";
import { verifySupabaseToken } from "@/lib/auth";

const authCookieName = "sb-aiswarmqa-auth-token";

function authCookie(value: string, maxAge: number) {
  return [
    `${authCookieName}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${Math.max(0, maxAge)}`,
    "HttpOnly",
    "SameSite=Lax",
    process.env.NODE_ENV === "production" ? "Secure" : null
  ]
    .filter(Boolean)
    .join("; ");
}

function clearAuthCookie() {
  return authCookie("", 0);
}

export async function POST(request: Request) {
  try {
    const config = readRuntimeConfig();
    if (!config.supabaseUrl || !config.supabasePublishableKey) {
      return jsonError("AUTH_NOT_CONFIGURED", "Supabase Auth is not configured.", 503);
    }

    const body = (await request.json().catch(() => null)) as { accessToken?: unknown; expiresAt?: unknown } | null;
    const accessToken = typeof body?.accessToken === "string" ? body.accessToken : null;
    const expiresAt = typeof body?.expiresAt === "number" ? body.expiresAt : null;
    if (!accessToken) {
      return jsonError("AUTH_SESSION_INVALID", "A valid Supabase session token is required.", 400);
    }

    await verifySupabaseToken({
      supabaseUrl: config.supabaseUrl,
      publishableKey: config.supabasePublishableKey,
      token: accessToken
    });

    const maxAge = Math.max(60, expiresAt ? expiresAt - Math.floor(Date.now() / 1000) : 60 * 60);
    const cookieValue = JSON.stringify({ access_token: accessToken, expires_at: expiresAt });
    return Response.json(
      { ok: true },
      {
        headers: {
          "set-cookie": authCookie(cookieValue, maxAge)
        }
      }
    );
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}

export async function DELETE() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "set-cookie": clearAuthCookie()
      }
    }
  );
}
