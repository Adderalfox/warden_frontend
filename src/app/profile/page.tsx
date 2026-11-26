"use client";

import { useState, type FormEvent } from "react";
import { usePageContext } from "@/components/assistant/assistant-context";
import { Panel } from "@/components/metrics/panel";
import { useAuth } from "@/components/shell/auth-context";
import { initials } from "@/components/shell/sidebar";
import { Notice } from "@/components/ui/notice";
import { changePassword, updateProfile } from "@/lib/auth-api";
import { fmtDateTime } from "@/lib/format";

const input = "w-full rounded-lg border border-warden-border bg-warden-bg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-warden-accent/60 focus:outline-none disabled:opacity-50";
const btn = "rounded-lg bg-warden-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40";

export default function ProfilePage() {
  usePageContext({ page: "Profile" });
  const { user, setUser, authRequired } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<"" | "name" | "pw">("");

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setBusy("name");
    setNameMsg(null);
    try {
      setUser(await updateProfile(name));
      setNameMsg({ ok: true, text: "Profile updated." });
    } catch (err) {
      setNameMsg({ ok: false, text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setBusy("");
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (next !== confirm) return setPwMsg({ ok: false, text: "New passwords don't match." });
    setBusy("pw");
    try {
      await changePassword(cur, next);
      setCur(""); setNext(""); setConfirm("");
      setPwMsg({ ok: true, text: "Password changed. Other devices have been signed out." });
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't change password" });
    } finally {
      setBusy("");
    }
  }

  if (!user) return null;
  return (
    <div className="max-w-3xl space-y-4 px-5 pb-10 pt-2">
      <div>
        <h1 className="text-xl font-semibold text-white">Profile</h1>
        <p className="mt-0.5 text-sm text-slate-500">Your account details and security.</p>
      </div>

      {!authRequired && <Notice tone="info">Login is switched off on this server (<code className="font-mono">WARDEN_AUTH_REQUIRED=false</code>), so there is no account to edit.</Notice>}

      <Panel title="Account">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-warden-accent/15 text-xl font-semibold text-warden-accent">{initials(user.name)}</span>
          <div>
            <div className="text-lg font-semibold text-white">{user.name}</div>
            <div className="text-sm text-slate-400">{user.email}</div>
            {authRequired && (
              <div className="mt-1 text-xs text-slate-600">
                Member since {user.created_at ? fmtDateTime(user.created_at * 1000) : "—"}
                {user.last_login_at ? ` · last sign-in ${fmtDateTime(user.last_login_at * 1000)}` : ""}
              </div>
            )}
          </div>
        </div>
        <form onSubmit={saveName} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Display name</label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required disabled={!authRequired} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">E-mail</label>
            <input className={input} value={user.email} disabled />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button className={btn} disabled={!authRequired || busy === "name" || name.trim() === user.name}>{busy === "name" ? "Saving…" : "Save changes"}</button>
            {nameMsg && <span className={nameMsg.ok ? "text-sm text-warden-accent" : "text-sm text-warden-danger"}>{nameMsg.text}</span>}
          </div>
        </form>
      </Panel>

      {authRequired && (
        <Panel title="Change password" subtitle="Changing it signs you out everywhere else.">
          <form onSubmit={savePassword} className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Current password</label>
              <input className={input} type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">New password</label>
              <input className={input} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={8} required placeholder="8+ characters" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Confirm new password</label>
              <input className={input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required />
            </div>
            <div className="flex items-center gap-3 sm:col-span-3">
              <button className={btn} disabled={busy === "pw"}>{busy === "pw" ? "Updating…" : "Update password"}</button>
              {pwMsg && <span className={pwMsg.ok ? "text-sm text-warden-accent" : "text-sm text-warden-danger"}>{pwMsg.text}</span>}
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}
