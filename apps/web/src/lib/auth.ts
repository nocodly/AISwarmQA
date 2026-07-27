import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { getDevelopmentActor, getOrCreateSupabaseActor, type AuthenticatedActor } from "@ai-swarm-qa/database";

type SupabaseUserResponse = {
  id?: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
  };
};

export class AuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireAuth(request: Request): Promise<AuthenticatedActor> {
  const config = readRuntimeConfig();
  const token = extractBearerToken(request) ?? extractSupabaseCookieToken(request.headers.get("cookie"));
  if (token && config.supabaseUrl && config.supabasePublishableKey) {
    const user = await verifySupabaseToken({
      supabaseUrl: config.supabaseUrl,
      publishableKey: config.supabasePublishableKey,
      token
    });
    if (user.id && user.email) {
      return getOrCreateSupabaseActor({
        supabaseUserId: user.id,
        email: user.email,
        name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
      });
    }
  }

  if (process.env.NODE_ENV !== "production" && config.authAllowDevActor) {
    const { user, organization } = await getDevelopmentActor();
    return { userId: user.id, workspaceId: organization.id, email: user.email };
  }

  throw new AuthError("AUTH_REQUIRED", "Sign in is required.");
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  return null;
}

function extractBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice("bearer ".length).trim() || null;
}

function extractSupabaseCookieToken(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  for (const cookie of cookies) {
    const [name, rawValue] = cookie.split("=");
    if (!name?.startsWith("sb-") || !name.endsWith("-auth-token") || !rawValue) continue;
    const decoded = decodeURIComponent(rawValue);
    const token = parseCookieAuthToken(decoded);
    if (token) return token;
  }
  return null;
}

function parseCookieAuthToken(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0];
    if (parsed && typeof parsed === "object" && "access_token" in parsed && typeof parsed.access_token === "string") {
      return parsed.access_token;
    }
  } catch {
    return null;
  }
  return null;
}

async function verifySupabaseToken(input: { supabaseUrl: string; publishableKey: string; token: string }) {
  const response = await fetch(`${input.supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: input.publishableKey,
      authorization: `Bearer ${input.token}`
    }
  });
  if (!response.ok) {
    throw new AuthError("AUTH_INVALID", "The current sign-in session is invalid.", 401);
  }
  return (await response.json()) as SupabaseUserResponse;
}

