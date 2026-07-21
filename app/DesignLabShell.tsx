"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { LAB_PERSONAS, LAB_SURFACES, LabSurface, viewsFor } from "@/lib/design-lab";
import styles from "./design-lab.module.css";

export default function DesignLabShell({ surface, view, source, children }: { surface: LabSurface; view: string; source?: string; children?: ReactNode }) {
  const [persona, setPersona] = useState("david");
  const views = viewsFor(surface);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const value = new URLSearchParams(window.location.search).get("persona");
      if (value && LAB_PERSONAS.some((candidate) => candidate.id === value)) setPersona(value);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const navigate = (href: string, nextPersona = persona) => {
    const url = new URL(href, window.location.origin);
    url.searchParams.set("persona", nextPersona);
    window.location.assign(url.toString());
  };

  const sceneSource = source ? `${source}${source.includes("?") ? "&" : "?"}persona=${persona}` : undefined;

  return <main className={styles.shell}>
    <header className={styles.lab}>
      <Link className={styles.brand} href="/" aria-label="Kiduna Design home"><i /> <span><b>KIDUNA</b><small>DESIGN LAB · CONCEPTUAL PROTOTYPE</small></span></Link>
      <div className={styles.controls}>
        <label><span>Surface</span><select value={surface} onChange={(event) => { const target = LAB_SURFACES.find((item) => item.id === event.target.value); if (target?.href) navigate(target.href); }}>
          {LAB_SURFACES.map((item) => <option key={item.id} value={item.id} disabled={!item.href}>{item.label}{!item.href ? " · coming later" : ""}</option>)}
        </select></label>
        <label><span>View</span><select value={view} onChange={(event) => { const target = views.find((item) => item.id === event.target.value); if (target) navigate(target.href); }}>
          {views.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></label>
        <label><span>Persona</span><select value={persona} onChange={(event) => { const next = event.target.value; setPersona(next); const current = views.find((item) => item.id === view); if (current) navigate(current.href, next); }}>
          {LAB_PERSONAS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></label>
      </div>
    </header>
    <section className={styles.stage} aria-label={`${surface} · ${view} · ${persona} perspective`}>
      {sceneSource ? <iframe key={sceneSource} src={sceneSource} title={views.find((item) => item.id === view)?.label ?? view} /> : children}
    </section>
  </main>;
}
