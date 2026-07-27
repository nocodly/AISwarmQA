"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";

type AuthConfig = {
  configured: boolean;
  supabaseUrl: string | null;
  supabasePublishableKey: string | null;
};

const authCookieName = "sb-aiswarmqa-auth-token";

export function AuthClient() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [configured, setConfigured] = useState(true);
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

      const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true
        }
      });
      setClient(supabase);

      const current = await supabase.auth.getSession();
      syncAuthCookie(current.data.session);
      setSessionEmail(current.data.session?.user.email ?? null);

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        syncAuthCookie(session);
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

    const result =
      mode === "signup"
        ? await client.auth.signUp({
            email,
            password,
            options: {
              data: {
                name: name.trim() || undefined,
                full_name: name.trim() || undefined
              }
            }
          })
        : await client.auth.signInWithPassword({ email, password });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    syncAuthCookie(result.data.session);
    if (result.data.session) {
      window.location.href = "/dashboard";
      return;
    }

    setMessage("Check your email to confirm the account, then sign in.");
    setLoading(false);
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    clearAuthCookie();
    setSessionEmail(null);
  }

  return (
    <section className="auth-page sketch-section">
      <div className="qa-annotations auth-notes" aria-hidden="true">
        <span className="qa-note marker-lime">session fixed</span>
        <span className="qa-note marker-orange">secure cookie</span>
        <span className="tiny-bug bug-one">ship after login</span>
      </div>
      <div className="auth-card">
        <p className="marketing-eyebrow">Account access</p>
        <h1>{title}</h1>
        <p>Start audits, save evidence, and export findings to GitHub from one workspace.</p>

        {sessionEmail ? (
          <div className="auth-session">
            <CheckCircle2 aria-hidden="true" size={20} />
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
                <AlertCircle aria-hidden="true" size={18} />
                Supabase Auth is not configured for this deployment.
              </div>
            ) : null}

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <label>
                  <span>Name</span>
                  <span className="auth-input">
                    <UserRound aria-hidden="true" size={18} />
                    <input autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder="Alex Founder" value={name} />
                  </span>
                </label>
              ) : null}
              <label>
                <span>Email</span>
                <span className="auth-input">
                  <Mail aria-hidden="true" size={18} />
                  <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required type="email" value={email} />
                </span>
              </label>
              <label>
                <span>Password</span>
                <span className="auth-input">
                  <LockKeyhole aria-hidden="true" size={18} />
                  <input autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="8+ characters" required type="password" value={password} />
                </span>
              </label>

              {error ? (
                <div className="auth-alert error">
                  <AlertCircle aria-hidden="true" size={18} />
                  {error}
                </div>
              ) : null}
              {message ? (
                <div className="auth-alert success">
                  <CheckCircle2 aria-hidden="true" size={18} />
                  {message}
                </div>
              ) : null}

              <button className="cta-button" disabled={!configured || loading || !client} type="submit">
                {loading ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

function syncAuthCookie(session: Session | null) {
  if (!session?.access_token) {
    clearAuthCookie();
    return;
  }

  const maxAge = Math.max(60, session.expires_at ? session.expires_at - Math.floor(Date.now() / 1000) : 60 * 60);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const value = encodeURIComponent(
    JSON.stringify({
      access_token: session.access_token,
      expires_at: session.expires_at
    })
  );
  document.cookie = `${authCookieName}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function clearAuthCookie() {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${authCookieName}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
