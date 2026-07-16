"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./personal.module.css";

type Device = "mac" | "windows" | "iphone" | "android" | "web";
type Surface = { id: string; name: string; description: string; ideal: string; mark: string };

const surfaces: Surface[] = [
  { id: "studio", name: "Studio", description: "The full spatial Field for sustained creation, organizations, Projects, artifacts, and Allies.", ideal: "Mac & desktop", mark: "ST" },
  { id: "tv", name: "TV", description: "A shared-room Surface for collective attention, presentation, ambient presence, and gathering.", ideal: "Television & spatial display", mark: "TV" },
  { id: "express", name: "Express", description: "The immediate mobile Surface for conversation, approvals, capture, and movement through the day.", ideal: "iPhone & Android", mark: "EX" },
  { id: "live", name: "Live", description: "The embodied Surface for synchronous presence, events, performance, and real-time participation.", ideal: "Live environments", mark: "LI" },
];

export default function PersonalPageClient({ account, initialDevice }: { account: { name: string; handle: string; email: string; personas: { id: string; name: string; initials: string }[] }; initialDevice: Device }) {
  const device = initialDevice;
  const [notice, setNotice] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const primary = device === "iphone" || device === "android" ? "express" : "studio";
  const primarySurface = surfaces.find((surface) => surface.id === primary) ?? surfaces[0];

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.assign("/"); }
  function simulate(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 3200); }
  async function redeem() {
    const response = await fetch("/api/codes/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: redeemCode }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { simulate(payload.error || "That Code could not be accepted."); return; }
    setRedeemCode(""); simulate("Kinship Code accepted. The Relationship and its context are now available in your Field.");
  }

  return <main className={styles.page} style={{ height: "100svh", overflowX: "hidden", overflowY: "auto", overscrollBehaviorY: "contain" }}>
    <div className={styles.weather} aria-hidden="true" />
    <header className={styles.top}><Link href={`/${account.handle}`}><Image src="/kiduna-mark.svg" alt="" width={40} height={40}/><span><small>KINSHIP.DESIGN</small><strong>/{account.handle}</strong></span></Link><nav><Link href="/studio">Enter Studio</Link><button onClick={() => void logout()}>Log out</button></nav></header>
    <section className={styles.identity}><div><span>PERSONAL WEB PAGE · PROTOTYPE</span><h1>{account.name}</h1><p>kinship.design/{account.handle}</p></div><div className={styles.personas}><small>YOUR PERSONAS</small>{account.personas.map((persona) => <span key={persona.id}><b>{persona.initials}</b>{persona.name}</span>)}</div></section>

    <section className={styles.webRule}><i>WEB</i><div><strong>Some things stay here.</strong><p>Identity, wallet, compute, recovery, and durable configuration remain on the Web—outside every device-controlled Surface.</p></div><span>CANONICAL ACCOUNT LAYER</span></section>
    <section className={styles.redeem}><div><small>HAVE A KINSHIP CODE?</small><strong>Bring an invitation into your account.</strong></div><input aria-label="Kinship Code" value={redeemCode} onChange={(event)=>setRedeemCode(event.target.value)} placeholder="KIN-••••-••••-••••"/><button disabled={!redeemCode.trim()} onClick={()=>void redeem()}>Accept Code <span>→</span></button></section>

    <section className={styles.surfaces}>
      <header><span>YOUR KIDUNA SURFACES</span><h2>Meet the moment on the right Surface.</h2><p>Based on this device, {primarySurface.name} is the clearest way in. You can still open any Surface.</p></header>
      <div className={styles.surfaceGrid}>{surfaces.map((surface) => <article key={surface.id} className={surface.id === primary ? styles.primarySurface : ""}>
        {surface.id === primary && <em>RECOMMENDED ON THIS DEVICE</em>}<div className={styles.surfaceMark}>{surface.mark}</div><small>SURFACE · {surface.ideal}</small><h3>{surface.name}</h3><p>{surface.description}</p>
        {surface.id === primary ? <SurfaceAction device={device} surface={surface.id} onAction={simulate}/> : <button onClick={() => simulate(`${surface.name} is represented here as a prototype destination.`)}>Explore {surface.name}<span>→</span></button>}
      </article>)}</div>
    </section>

    <section className={styles.resources}>
      <div className={styles.wallet}><header><span>YOUR WALLET</span><h2>Resources you can carry and direct.</h2><p>Prototype balances—no real funds or purchases are moving.</p></header><div className={styles.balances}><article><i>$K</i><span><small>$KIDUNA</small><strong>2,450.00</strong><em>network value</em></span></article><article><i>$S</i><span><small>$SERVICE</small><strong>680.00</strong><em>work & exchange</em></span></article><article><i>$P</i><span><small>$PLAY</small><strong>1,200.00</strong><em>experience & games</em></span></article></div><button className={styles.manage} onClick={() => simulate("Wallet management is a prototype convention; no transaction was made.")}>Manage wallet <span>→</span></button></div>
      <div className={styles.compute}><header><span>COMPUTE</span><strong>12,480</strong><small>compute units available</small></header><div className={styles.meter}><i style={{width:"62%"}}/></div><p>Compute is shared by your Allies and authorized Actors. Add more here without depending on any Surface or app store.</p><div className={styles.computeOptions}>{[["5K","$5"],["25K","$20"],["100K","$65"]].map(([units,price])=><button key={units} onClick={()=>simulate(`${units} compute selected. Checkout is simulated in this prototype.`)}><strong>{units}</strong><span>{price}</span></button>)}</div><small>Prototype purchase · no charge will occur</small></div>
    </section>
    {notice && <div className={styles.notice}>{notice}</div>}
    <footer><Image src="/kiduna-mark.svg" alt="" width={28} height={28}/><p>Personal Web convention · account settings remain available even when device Surfaces change.</p><span>PROTOTYPE · 2026</span></footer>
  </main>;
}

function SurfaceAction({ device, surface, onAction }: { device: Device; surface: string; onAction: (message: string) => void }) {
  if (surface === "express" && device === "iphone") return <button className={styles.storeButton} onClick={() => onAction("The App Store handoff is represented; no app is installed.")}><b>●</b><span><small>Download on the</small>App Store</span></button>;
  if (surface === "express" && device === "android") return <button className={styles.storeButton} onClick={() => onAction("The Google Play handoff is represented; no app is installed.")}><b>▶</b><span><small>GET IT ON</small>Google Play</span></button>;
  const platform = device === "mac" ? "Mac" : device === "windows" ? "Windows" : "desktop";
  return <button className={styles.downloadButton} onClick={() => onAction(`Kiduna Studio for ${platform} is represented as a one-button download; no file was installed.`)}>Download Kiduna Studio for {platform}<span>↓</span></button>;
}
