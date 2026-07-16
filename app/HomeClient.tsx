"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import styles from "./home.module.css";

type Props = { account: { name: string; handle: string; email: string } | null; verification: string | null };

export default function HomeClient({ account, verification }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(verification === "invalid" ? "That verification link is invalid or expired." : verification === "code" ? "That Kinship Code can no longer be redeemed." : "");
  const [result, setResult] = useState<{ message: string; prototypeVerificationUrl?: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setResult(null);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const payload = await response.json() as { error?: string; handle?: string; message?: string; prototypeVerificationUrl?: string };
      if (!response.ok) throw new Error(payload.error || "That didn’t work.");
      if (mode === "login") window.location.assign(`/${payload.handle}`);
      else setResult({ message: payload.message || "Check your email.", prototypeVerificationUrl: payload.prototypeVerificationUrl });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn’t work.");
    } finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return <main className={styles.home}>
    <div className={styles.weather} aria-hidden="true" />
    <header><Image src="/kiduna-mark.svg" alt="" width={42} height={42} /><span><b>KIDUNA STUDIO</b><small>Working prototype</small></span><em>EXPERIMENTAL · NOT THE DEPLOYED SYSTEM</em></header>
    <section className={styles.intro}>
      <span>THE FIELD BEGINS WITH RELATIONSHIP</span>
      <h1>Enter at the<br/>Inception Point.</h1>
      <p>This is a functional prototype for learning how Kiduna should work. Accounts, invitations, Codes, trust, lineage, and relationship Wisdom created here are experimental.</p>
      <div><i /> Prototype environment <i /></div>
    </section>
    <section className={styles.access}>
      {account ? <div className={styles.returning}>
        <small>SIGNED IN TO THE PROTOTYPE</small><h2>Welcome back, {account.name}.</h2><p>{account.email}</p>
        <a href={`/${account.handle}`}>Open your page <span>→</span></a><button onClick={logout}>Sign out</button>
      </div> : <>
        <div className={styles.tabs}><button className={mode === "login" ? styles.active : ""} onClick={() => { setMode("login"); setError(""); }}>Log in</button><button className={mode === "signup" ? styles.active : ""} onClick={() => { setMode("signup"); setError(""); }}>Sign up</button></div>
        <form onSubmit={submit}>
          <div className={styles.formHeading}><small>{mode === "login" ? "RETURN TO THE FIELD" : "ENTER BY KINSHIP"}</small><h2>{mode === "login" ? "Log in" : "Create your account"}</h2><p>{mode === "login" ? "Use the account you created for this prototype." : "A Kinship Code connects your arrival to the person who invited you."}</p></div>
          {mode === "signup" && <label><span>Name</span><input name="name" autoComplete="name" required /></label>}
          {mode === "signup" && <label><span>Handle</span><div className={styles.handleField}><i>kinship.design/</i><input name="handle" autoComplete="username" minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9-]*[a-z0-9]" placeholder="your-handle" required /></div></label>}
          <label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
          <PasswordField mode={mode} />
          {mode === "signup" && <label><span>Kinship Code</span><input name="kinshipCode" autoComplete="off" placeholder="KIN-••••-••••-••••" required /></label>}
          {error && <div className={styles.error}>{error}</div>}
          {result && <div className={styles.success}><strong>{result.message}</strong>{result.prototypeVerificationUrl && <a href={result.prototypeVerificationUrl}>Use prototype verification link →</a>}</div>}
          <button className={styles.submit} type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Continue" : "Create account & verify email"}</button>
        </form>
        <footer>{mode === "signup" ? "Invitation required · Email verification required" : "Private prototype access"}</footer>
      </>}
    </section>
  </main>;
}

function PasswordField({ mode }: { mode: "login" | "signup" }) {
  const [visible, setVisible] = useState(false);
  return <label><span>Password</span><div className={styles.passwordField}><input name="password" type={visible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "signup" ? 10 : undefined} required /><button type="button" aria-label={visible ? "Hide password" : "Show password"} title={visible ? "Hide password" : "Show password"} onClick={() => setVisible((value) => !value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.75"/>{visible && <path d="m4 4 16 16"/>}</svg></button></div></label>;
}
