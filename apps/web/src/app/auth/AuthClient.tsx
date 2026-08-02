"use client";

import Link from "next/link";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { LinearIcon } from "@/components/BrandIcons";

type AuthConfig = {
  configured: boolean;
  instantSignupConfigured: boolean;
  supabaseUrl: string | null;
  supabasePublishableKey: string | null;
};

export function AuthClient() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [configured, setConfigured] = useState(true);
  const [instantSignupConfigured, setInstantSignupConfigured] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      const response = await fetch("/api/auth/config", { cache: "no-store" });
      const config = (await response.json()) as AuthConfig;
      if (!active) return;
      if (!config.configured || !config.supabaseUrl || !config.supabasePublishableKey) {
        setConfigured(false);
        return;
      }
      setInstantSignupConfigured(config.instantSignupConfigured);

      const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true
        }
      });
      setClient(supabase);

      const current = await supabase.auth.getSession();
      void syncAuthCookie(current.data.session);
      setSessionEmail(current.data.session?.user.email ?? null);

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        void syncAuthCookie(session);
        setSessionEmail(session?.user.email ?? null);
      });
      return () => data.subscription.unsubscribe();
    }

    let unsubscribe: (() => void) | undefined;
    void loadConfig().then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const title = useMemo(() => (mode === "signup" ? "Create your AI SwarmQA account" : "Sign in to AI SwarmQA"), [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const signupResponse = await fetch("/api/auth/signup", {
        body: JSON.stringify({ email, name, password }),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const signupBody = (await signupResponse.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!signupResponse.ok) {
        setError(signupBody?.error?.message ?? "Account could not be created.");
        setLoading(false);
        return;
      }
    }

    const result = await client.auth.signInWithPassword({ email, password });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    await syncAuthCookie(result.data.session);
    if (result.data.session) {
      window.location.href = "/dashboard";
      return;
    }

    setMessage("Account created. Opening your dashboard.");
    setLoading(false);
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    await clearAuthCookie();
    setSessionEmail(null);
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="marketing-eyebrow">Account access</p>
        <h1>{title}</h1>
        <p>Start audits, save evidence, and export findings to GitHub from one workspace.</p>

        {sessionEmail ? (
          <div className="auth-session">
            <LinearIcon name="issues" />
            <div>
              <strong>Signed in as {sessionEmail}</strong>
              <span>Your dashboard is ready.</span>
            </div>
            <Link className="cta-button small" href="/dashboard">
              Open dashboard
            </Link>
            <button className="ghost-button" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button className={mode === "signup" ? "active" : ""} type="button" onClick={() => setMode("signup")}>
                Create account
              </button>
              <button className={mode === "signin" ? "active" : ""} type="button" onClick={() => setMode("signin")}>
                Sign in
              </button>
            </div>

            {!configured ? (
              <div className="auth-alert error">
                <LinearIcon name="issues" />
                Supabase Auth is not configured for this deployment.
              </div>
            ) : null}
            {configured && mode === "signup" && !instantSignupConfigured ? (
              <div className="auth-alert error">
                <LinearIcon name="issues" />
                Instant signup is not configured for this deployment.
              </div>
            ) : null}

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <label>
                  <span>Name</span>
                  <span className="auth-input">
                    <LinearIcon name="inbox" />
                    <input autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder="Alex Founder" value={name} />
                  </span>
                </label>
              ) : null}
              <label>
                <span>Email</span>
                <span className="auth-input">
                  <LinearIcon name="inbox" />
                  <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required type="email" value={email} />
                </span>
              </label>
              <label>
                <span>Password</span>
                <span className="auth-input">
                  <LinearIcon name="inbox" />
                  <input autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="8+ characters" required type="password" value={password} />
                </span>
              </label>

              {error ? (
                <div className="auth-alert error">
                  <LinearIcon name="issues" />
                  {error}
                </div>
              ) : null}
              {message ? (
                <div className="auth-alert success">
                  <LinearIcon name="issues" />
                  {message}
                </div>
              ) : null}

              <button className="cta-button" disabled={!configured || loading || !client || (mode === "signup" && !instantSignupConfigured)} type="submit">
                {loading ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

async function syncAuthCookie(session: Session | null) {
  if (!session?.access_token) {
    await clearAuthCookie();
    return;
  }

  await fetch("/api/auth/session", {
    body: JSON.stringify({ accessToken: session.access_token, expiresAt: session.expires_at }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
}

async function clearAuthCookie() {
  await fetch("/api/auth/session", { method: "DELETE" });
}
