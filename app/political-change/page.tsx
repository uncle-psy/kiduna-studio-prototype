import type { Metadata } from "next";
import Link from "next/link";
import { HubHeader } from "../ui/HubHeader";
import PoliticalChangeLibrary from "./PoliticalChangeLibrary";
import styles from "./political-change.module.css";

export const metadata: Metadata = {
  title: "Political Change System — Kiduna Design",
  description: "A vast, nonpartisan symbolic map of how power is acquired, exercised, resisted, legitimized, disrupted, reformed, captured, distributed, and transformed.",
};

const featured = [
  ["Power", "the capacity to shape conduct, choices, agendas, meanings, and material conditions"],
  ["Protest", "private grievance becoming shared fact, collective refusal, pressure, ritual, and risk"],
  ["Constitution", "power agreeing in advance to limits on itself; memory hardened into rules"],
  ["General Strike", "the governed discovering that institutions cannot function without their participation"],
  ["Regulatory Capture", "the watchdog slowly learning to speak with the voice of what it watches"],
  ["Revolution", "the accepted structure of legitimacy ceasing to reproduce itself"],
] as const;

export default function PoliticalChangePage() {
  return (
    <div className={styles.page}>
      <HubHeader />
      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>KIDUNA · LIVING SYMBOLIC SYSTEM · FIRST EDITION</p>
            <h1>Political<br/><em>Change.</em></h1>
            <p className={styles.dek}>A vast, interconnected map of how power is acquired, exercised, resisted, legitimized, disrupted, reformed, captured, distributed, and transformed.</p>
            <p className={styles.position}>Not a partisan deck. Not civics flashcards. A research-grounded field for seeing political change itself.</p>
            <div className={styles.actions}>
              <a className={styles.primaryButton} href="#library">Explore the 1,168 nodes</a>
              <a href="/downloads/Political-Change-System-Complete-v1.0.0.zip" download>Download complete system ↓</a>
            </div>
            <div className={styles.metrics} aria-label="System totals">
              <div><b>4,672</b><span>evaluated candidates</span></div>
              <div><b>1,168</b><span>curated core nodes</span></div>
              <div><b>2,287</b><span>typed relationships</span></div>
              <div><b>160</b><span>mapshifts</span></div>
            </div>
          </div>
          <figure className={styles.heroArt}>
            <span className={styles.orbit}/>
            <img src="/political-change/enamel-triptych.png" alt="Three high-fidelity enamel Political Change cards representing Protest, Constitution, and Revolution" width={1536} height={1024}/>
            <figcaption><b>A field of forces, not a line of slogans.</b><span>Each node holds mechanism, forces, frictions, strategy, divination, evidence, and relation.</span></figcaption>
          </figure>
        </section>

        <section className={styles.thesis}>
          <div><p className={styles.eyebrow}>THE DEEPER LEVEL</p><h2>Every political object<br/>is also a <em>relationship.</em></h2></div>
          <p>A protest is visibility, refusal, solidarity, risk, ritual, pressure, and the conversion of private grievance into shared fact. A constitution is power promising limits to itself. A gerrymander is the ruler choosing the electorate. The system opens familiar terms until their operative structure becomes visible.</p>
        </section>

        <section className={styles.featured} aria-label="Foundational political change nodes">
          {featured.map(([title, copy], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </section>

        <section className={styles.librarySection} id="library">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>THE CURATED CORE</p>
            <h2>Search the architecture<br/>of political change.</h2>
            <p>Browse 49 families spanning deep forces, institutions, movements, elections, money, media, coercion, ideology, political economy, identity, current movements, and contested terrain. Open any node for its full interpretive and evidence profile.</p>
          </div>
          <PoliticalChangeLibrary />
        </section>

        <section className={styles.mapshiftSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>160 MAPSHIFTS</p>
            <h2>Change the map.<br/><em>Recover a move.</em></h2>
            <p>A mapshift does not tell you what to believe. It reveals assumptions, changes viewpoint or scale, traces dependencies, and creates a more exact question.</p>
          </div>
          <div className={styles.shiftGrid}>
            <article><small>DEFAULT MAP</small><h3>Power is what rulers possess.</h3><i>↓ change viewpoint</i><small>CHANGED MAP</small><p>Power is a relationship reproduced by obedience, resources, rules, dependency, and imagination.</p></article>
            <article><small>DEFAULT MAP</small><h3>Protest is public expression.</h3><i>↓ follow the mechanism</i><small>CHANGED MAP</small><p>Protest converts dispersed private grievance into visible collective fact—and tests the legitimacy of response.</p></article>
            <article><small>DEFAULT MAP</small><h3>Procedure is neutral.</h3><i>↓ ask who benefits</i><small>CHANGED MAP</small><p>Procedure distributes time, veto, access, burden, and voice; every rule has a political geometry.</p></article>
          </div>
        </section>

        <section className={styles.integrity}>
          <div>
            <p className={styles.eyebrow}>EPISTEMIC INTEGRITY</p>
            <h2>Claims keep their<br/><em>status and source.</em></h2>
            <p>Empirical, historical, legal, interpretive, strategic, and symbolic claims are not flattened into one voice. Relationships carry confidence, contestation, perspective, conditions, evidence references, and provenance.</p>
          </div>
          <div className={styles.integrityCards}>
            <a href="/political-change/data/engine-output.json"><small>PRESERVED SEPARATELY</small><h3>Engine Output</h3><p>The Mapshifting Engine record remains an independent, inspectable artifact.</p><b>Open JSON ↗</b></a>
            <a href="/political-change/data/sentinel-handoffs.json"><small>ANNOTATION LAYER</small><h3>Sentinel Handoffs</h3><p>Risks, contestation, sensitivity, and review notes remain external to engine authorship.</p><b>Open JSON ↗</b></a>
          </div>
        </section>

        <section className={styles.contested}>
          <p className={styles.eyebrow}>CURRENT + CONTESTED TERRAIN</p>
          <div><h2>Neutrality is a method<br/>of greater precision.</h2><p>The system includes Israel/Palestine, Trump and MAGA, QAnon, No Kings, Indivisible, anti-ICE activism, extremist movements, and other current formations. Inclusion is not endorsement. Nodes distinguish self-description, documented behavior, scholarly or institutional classification, counterclaims, uncertainty, date, and jurisdiction.</p></div>
        </section>

        <section className={styles.complete}>
          <div><p className={styles.eyebrow}>THE COMPLETE EDITION</p><h2>Carry the whole<br/>political field.</h2><p>The archive contains one complete Markdown dossier per core node, the evaluated candidate ledger, relationship graph, schemas, manuals, lineages, spreads, games, research notes, visual constitution, enamel references, exports, static site, validation scripts, and results.</p></div>
          <a className={styles.downloadCard} href="/downloads/Political-Change-System-Complete-v1.0.0.zip" download><small>VERSION 1.0.0 · VALIDATED</small><h3>Political Change System</h3><p>4,672 candidates · 1,168 nodes · 2,287 edges · 160 mapshifts · 49 lineages · 24 spreads · 16 games · 53 sources</p><b>Download complete ZIP ↓</b></a>
        </section>
      </main>
      <footer className={styles.footer}><img src="/assets/kiduna/mark.svg" alt="" width={28} height={28}/><p>A living symbolic map of political change itself.</p><Link href="/">Kiduna.design →</Link></footer>
    </div>
  );
}
