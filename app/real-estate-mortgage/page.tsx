import type { Metadata } from "next";
import Link from "next/link";
import RealEstateLibrary from "./RealEstateLibrary";
import styles from "./real-estate.module.css";

export const metadata: Metadata = {
  title: "Real Estate & Mortgage — Complete Enamel System",
  description: "A complete 659-tile graph of land, home, rights, mortgage finance, capital, building, regulation, history, and belonging.",
  openGraph: {
    title: "Real Estate & Mortgage — Complete Enamel System",
    description: "659 luminous enamel tiles connected by 1,302 typed relationships.",
    images: ["/real-estate-mortgage/enamel-life-light-sample-01.png"],
  },
};

const lifecycle = [
  ["01", "Land becomes place", "Parcel, boundary, survey, infrastructure, ecology, and neighborhood make ground legible and lived."],
  ["02", "Place becomes property", "Tenure, title, deed, easement, lien, zoning, and exclusion allocate authority across people and time."],
  ["03", "Property becomes collateral", "Appraisal, underwriting, mortgage terms, closing, servicing, and default bind a home to a promise."],
  ["04", "Collateral becomes capital", "Pools, securities, tranches, warehouse lines, servicing rights, and markets circulate claims and risk."],
  ["05", "Capital returns to place", "Development, construction, operation, maintenance, adaptation, policy, and community turn finance back into lived consequence."],
];

const registers = [
  ["Personal", "What is held, promised, protected, inherited, or deferred in a life?"],
  ["Professional", "Who owns each handoff among information, authority, incentives, work, and capital?"],
  ["Financial", "How are cash flow, priority, liquidity, duration, and loss distributed?"],
  ["Property", "What can this place become, and which rights or constraints govern that change?"],
  ["Community", "Which benefits remain inside the parcel—and which costs cross its boundary?"],
];

export default function RealEstateMortgagePage() {
  return (
    <div className={styles.realm}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/"><img src="/assets/kiduna/mark.svg" alt="" width={34} height={34}/><span><b>Kiduna</b><small>Design systems</small></span></Link>
        <nav aria-label="Real Estate & Mortgage system navigation"><a href="#map">The map</a><a href="#tiles">659 tiles</a><a href="#library">Library</a></nav>
        <Link className={styles.back} href="/">All systems ←</Link>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>THE COMPLETE ENAMEL PROPERTY SYSTEM</p>
            <span className={styles.release}>System 13 · First edition · 24 August 2026</span>
            <h1>Real Estate<br/><em>& Mortgage</em></h1>
            <p className={styles.lede}>Land becomes place. Place becomes property. Property becomes collateral. Collateral becomes capital. People live inside the consequences.</p>
            <p className={styles.promise}>The visual default is shelter, agency, family, safety, liquidity, and possibility. Shadow appears when the mechanism truly warrants a warning.</p>
            <div className={styles.actions}><a className={styles.primaryButton} href="#tiles">Enter all 659 tiles</a><a href="/downloads/Real-Estate-Mortgage-System-Complete-v1.0.0.zip" download>Download complete system ↓</a></div>
            <div className={styles.metrics}><div><b>659</b><span>enamel tiles</span></div><div><b>1,302</b><span>typed relations</span></div><div><b>1,723</b><span>evaluated candidates</span></div></div>
          </div>
          <figure className={styles.heroArt}>
            <img src="/real-estate-mortgage/enamel-life-light-sample-01.png" alt="Luminous brass and enamel real estate and mortgage tiles" width={1536} height={1024}/>
            <figcaption><b>Life-light material direction</b><span>Joy leads; warning remains precise.</span></figcaption>
          </figure>
        </section>

        <section className={styles.thesis} id="map">
          <div><p className={styles.eyebrow}>ONE SYSTEM · MANY MAPS</p><h2>Not merely an asset.<br/><em>A place where life happens.</em></h2></div>
          <p>Real estate is simultaneously shelter, territory, record, promise, collateral, business, infrastructure, memory, and belonging. The system keeps those maps in relation so financial precision never erases the human field—and human meaning never obscures the actual machinery.</p>
        </section>

        <section className={styles.lifecycle}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>THE COMPLETE CHAIN</p><h2>From ground<br/>to lived consequence.</h2></div>
          <div className={styles.lifecycleGrid}>{lifecycle.map(([number,title,copy])=><article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
        </section>

        <section className={styles.featured}>
          <figure><img src="/real-estate-mortgage/tiles/featured/thirty-year-fixed-mortgage.png" alt="Thirty-Year Fixed Mortgage luminous enamel tile" width={1254} height={1254}/></figure>
          <div><p className={styles.eyebrow}>THE QUALITY ANCHOR</p><h2>Thirty-Year<br/><em>Fixed Mortgage</em></h2><p>A warm home sits beside a fixed sun. Thirty equal moments carry a promise toward the horizon while the debt field narrows and the equity garden grows. The tile shows what the instrument offers at its best: stable shelter financed across time.</p><dl><div><dt>Archetype</dt><dd>The Promise</dd></div><div><dt>Gift</dt><dd>Predictability makes long-term household planning possible.</dd></div><div><dt>Shadow</dt><dd>A fixed payment is not the same as permanent affordability.</dd></div><div><dt>Question</dt><dd>What future income is being pledged, and what protection remains if conditions change?</dd></div></dl><a href="#thirty-year-fixed-mortgage">Open its complete tile ↓</a></div>
        </section>

        <section className={styles.tiles} id="tiles">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>THE COMPLETE TILE LIBRARY</p><h2>Every mechanism,<br/><em>fully opened.</em></h2><p>Search every artifact, instrument, right, institution, process, force, pathology, place, person, event, ritual, and record. Every tile carries operational meaning, gift, wound, five contextual readings, guidance, provenance, and typed graph connections.</p></div>
          <RealEstateLibrary/>
        </section>

        <section className={styles.registers}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>FIVE READING REGISTERS</p><h2>The same tile.<br/>A different map.</h2></div>
          <div>{registers.map(([name,copy])=><article key={name}><h3>{name}</h3><p>{copy}</p></article>)}</div>
        </section>

        <section className={styles.graph}>
          <div><p className={styles.eyebrow}>THE RELATIONSHIP GRAPH</p><h2>No tile stands alone.</h2><p>Each edge states direction, mechanism, condition, perspective, confidence, evidence, and consequence. The graph can become a reading interface, curriculum, transaction rehearsal, risk map, game, or evolving knowledge object.</p><div className={styles.graphLinks}><a href="/real-estate-mortgage/data/graph.json">Complete graph JSON ↗</a><a href="/real-estate-mortgage/data/relationships.json">Typed edge ledger ↗</a></div></div>
          <div className={styles.graphFlow}><span>Land</span><i>→</i><span>Property</span><i>→</i><span>Collateral</span><i>→</i><span>Capital</span><i>→</i><span>Place</span><small>Use value ⇄ Exchange value · Gift ⇄ Wound · Access ⇄ Obligation</small></div>
        </section>

        <section className={styles.librarySection} id="library">
          <div><p className={styles.eyebrow}>COMPLETE WORKING LIBRARY</p><h2>Carry the whole system.</h2><p>The preserved edition includes all 659 node dossiers, graph and adjacency exports, schemas, research provenance, 1,723-candidate ledger, manual, lineages, spreads, games, Sentinel handoffs, visual constitution, and reference artifacts.</p></div>
          <div className={styles.downloads}>
            <a href="/downloads/Real-Estate-Mortgage-System-Complete-v1.0.0.zip" download><small>COMPLETE EDITION</small><h3>Real Estate & Mortgage v1.0.0</h3><p>The full portable system, including every authored record and machine-readable export.</p><b>Download ZIP ↓</b></a>
            <a href="/real-estate-mortgage/README.md"><small>READABLE SOURCE</small><h3>System guide</h3><p>Identity, boundaries, navigation, ethics, data layout, validation, and operating notes.</p><b>Open guide ↗</b></a>
          </div>
        </section>

        <section className={styles.disclaimer}><p>Educational, strategic, symbolic, and reflective—not legal, lending, appraisal, tax, insurance, investment, or jurisdiction-specific advice. Operational decisions require current primary authority and qualified local professionals.</p></section>
      </main>

      <footer className={styles.footer}><img src="/assets/kiduna/mark.svg" alt="" width={28} height={28}/><p>Land, shelter, ownership, debt, capital, law, place, and belonging—held in one living graph.</p><Link href="/">Kiduna.design →</Link></footer>
    </div>
  );
}
