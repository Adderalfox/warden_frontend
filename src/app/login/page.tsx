"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { IconCpu, IconShield, IconSparkle, Logo } from "@/components/shell/icons";
import { NOAUTH_COOKIE, useAuth } from "@/components/shell/auth-context";
import { getAuthConfig, login, signup, type AuthConfig } from "@/lib/auth-api";

const input =
  "w-full rounded-lg border border-warden-border bg-warden-bg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-warden-accent/60 focus:outline-none";

function safeNext(n: string | null): string {
  return n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/login") ? n : "/";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { refresh, setUser } = useAuth();
  const [cfg, setCfg] = useState<AuthConfig | null>(null);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAuthConfig()
      .then((c) => {
        setCfg(c);
        if (!c.auth_required) {
          // No login on this server: leave a marker so the route gate lets us through.
          document.cookie = `${NOAUTH_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
          refresh().then(() => router.replace(next));
        } else {
          document.cookie = `${NOAUTH_COOKIE}=; path=/; max-age=0`;
          if (c.first_user) setMode("signup");
        }
      })
      .catch(() => setCfgError("Can't reach the Warden backend. Is it running on port 8000?"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = mode === "login" ? await login(email, password) : await signup(name, email, password);
      setUser(user);
      await refresh();
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const canSignup = !!cfg?.signup_enabled;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-warden-border p-12 lg:flex">
        <div className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-warden-accent/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="text-xl font-semibold tracking-tight text-white">warden<span className="text-warden-accent">.ai</span></span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight text-white">Incidents understood and fixed, before the pager finishes ringing.</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Live pod analytics, autonomous root-cause diagnosis and human-approved remediation, in one place.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            {[
              [IconCpu, "Grafana-style pod analytics with automatic issue detection"],
              [IconShield, "Every code change waits for your approval"],
              [IconSparkle, "An AI assistant that reads the same dashboards you do"],
            ].map(([I, t], i) => {
              const Icon = I as typeof IconCpu;
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warden-accent/10 text-warden-accent"><Icon /></span>
                  {t as string}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="relative text-xs text-slate-600">Warden · autonomous incident remediation</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo className="h-7 w-7" />
            <span className="text-lg font-semibold text-white">warden<span className="text-warden-accent">.ai</span></span>
          </div>
          <h2 className="text-2xl font-semibold text-white">{mode === "login" ? "Welcome back" : cfg?.first_user ? "Create the first account" : "Create your account"}</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {mode === "login" ? "Sign in to open your dashboard." : cfg?.first_user ? "No accounts exist yet. This one will be your login." : "It only takes a moment."}
          </p>

          {cfgError && <div className="mt-6 rounded-lg border border-warden-danger/30 bg-warden-danger/5 px-3 py-2 text-sm text-warden-danger">{cfgError}</div>}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Name</label>
                <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" autoComplete="name" required maxLength={80} />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">E-mail</label>
              <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Password</label>
              <input
                className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : 1}
              />
            </div>
            {error && <div className="rounded-lg border border-warden-danger/30 bg-warden-danger/5 px-3 py-2 text-sm text-warden-danger">{error}</div>}
            <button
              type="submit" disabled={busy || !cfg?.auth_required}
              className="w-full rounded-lg bg-warden-accent py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === "login" ? (
              canSignup ? (
                <>New here? <button className="font-medium text-warden-accent hover:underline" onClick={() => { setMode("signup"); setError(null); }}>Create an account</button></>
              ) : cfg ? "Sign-ups are disabled. Ask an administrator for an account." : null
            ) : (
              <>Already have an account? <button className="font-medium text-warden-accent hover:underline" onClick={() => { setMode("login"); setError(null); }}>Sign in</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
