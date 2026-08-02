import { createClient } from "@supabase/supabase-js";
import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { z } from "zod";
import { assertRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const signupSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().trim().max(120).optional(),
  password: z.string().min(8).max(128)
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const config = readRuntimeConfig();
    await assertRateLimit(request, "auth-signup", config.rateLimitInvitationMax);
    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      return Response.json(
        { error: { code: "AUTH_SIGNUP_NOT_CONFIGURED", message: "Instant signup is not configured for this deployment." } },
        { status: 503 }
      );
    }

    const parsed = signupSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: { code: "AUTH_SIGNUP_INVALID", message: "Enter a valid email and a password with at least 8 characters." } }, { status: 400 });
    }

    const name = parsed.data.name?.trim() || undefined;
    const admin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const result = await admin.auth.admin.createUser({
      email: parsed.data.email,
      email_confirm: true,
      password: parsed.data.password,
      user_metadata: {
        full_name: name,
        name
      }
    });

    if (result.error) {
      const alreadyRegistered = result.error.message.toLowerCase().includes("already");
      return Response.json(
        {
          error: {
            code: alreadyRegistered ? "AUTH_EMAIL_ALREADY_REGISTERED" : "AUTH_SIGNUP_FAILED",
            message: alreadyRegistered ? "This email already has an account. Sign in instead." : "Account could not be created."
          }
        },
        { status: alreadyRegistered ? 409 : 400 }
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    const rate = rateLimitResponse(error);
    if (rate) return rate;
    return Response.json({ error: { code: "AUTH_SIGNUP_FAILED", message: "Account could not be created." } }, { status: 400 });
  }
}
