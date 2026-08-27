import type { Metadata } from "next";
import Link from "next/link";
import MilitaryCardLibrary from "./MilitaryCardLibrary";
import styles from "./military-systems.module.css";

export const metadata: Metadata = {
  title: "Mapshifting Military Systems — Power, Service, and the Long Aftermath",
  description: "A graph-native Mapshifting System of military power, Battle of 73 Easting, Veterans, Gulf War illness, VA navigation, family sustainment, crisis support, and memory.",
  openGraph: {
    title: "Mapshifting Military Systems",
    description: "Purpose. Force. Sustainment. Consequence. Return.",
    images: ["/military-systems/cards/whole-field-horizontal-v1.1.webp"],
  },
};

const chain = [
  ["01", "Purpose", "Why force is organized—and who may authorize it."],
  ["02", "Capability", "People, command, law, training, matter, information, and time."],
  ["03", "Battle", "A tactical event inside a larger campaign and political field."],
  ["04", "Service", "What continues after the institution’s formal boundary."],
  ["05", "Care", "Health, benefits, family, community, and qualified handoffs."],
  ["06", "Memory", "How consequence returns, is contested, and becomes public meaning."],
];

export default function MilitarySystemsPage() {
  return <div className={styles.realm}>
    <header className={styles.header}>
      <Link className={styles.brand} href="/"><img src="/assets/kiduna/mark.svg" alt="" width={34} height={34}/><span><b>Kiduna</b><small>Design systems</small></span></Link>
      <nav aria-label="Military Systems navigation"><a href="#field">The field</a><a href="#73-easting">73 Easting</a><a href="#cards">Eight cards</a><a href="#sources">Sources</a></nav>
      <Link className={styles.back} href="/">All systems ←</Link>
    </header>

    <main>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>MAPSHIFTING SYSTEM 12 · ENGINE 1.3</p>
          <span className={styles.release}>First Field edition · 27 August 2026</span>
          <h1>Military<br/><em>Systems</em></h1>
          <p className={styles.lede}>Purpose organizes force. Force consumes worlds. Consequence returns through bodies, families, landscapes, institutions, and memory.</p>
          <p className={styles.promise}>Not a catalog of weapons. A living graph of power, service, sustainment, consequence, care, and return.</p>
          <div className={styles.actions}><a className={styles.primaryButton} href="#cards">Enter the eight-card field</a><a href="/downloads/Mapshifting-Military-Systems-Web-v1.1.0.zip" download>Download web edition ↓</a></div>
          <div className={styles.metrics}><div><b>20</b><span>graph nodes</span></div><div><b>19</b><span>typed relations</span></div><div><b>8×2</b><span>paired card forms</span></div></div>
        </div>
        <div className={styles.heroField} aria-label="A layered field of Military Systems cards">
          <div className={styles.orbit} aria-hidden="true"/>
          <img className={styles.heroCardOne} src="/military-systems/cards/whole-field-vertical-v1.1.webp" alt="The Whole Field card" width={683} height={1024}/>
          <img className={styles.heroCardTwo} src="/military-systems/cards/73-easting-vertical-v1.1.webp" alt="73 Easting card" width={683} height={1024}/>
          <img className={styles.heroCardThree} src="/military-systems/cards/service-continues-vertical-v1.1.webp" alt="Service Continues card" width={683} height={1024}/>
          <p><b>THE LONG FIELD</b><span>Power does not end where the battle map ends.</span></p>
        </div>
      </section>

      <section className={styles.thesis} id="field">
        <div><p className={styles.eyebrow}>ONE SYSTEM · MANY CLOCKS</p><h2>See the battle.<br/><em>Keep following.</em></h2></div>
        <p>Military power is a relational field joining political purpose, authority, people, command, logistics, law, technology, medicine, environment, opposition, aftermath, and memory. The System keeps those maps connected without pretending one viewpoint contains them all.</p>
      </section>

      <section className={styles.chain}>
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>THE COMPLETE PASSAGE</p><h2>Power enters history.<br/>History enters life.</h2></div>
        <div className={styles.chainGrid}>{chain.map(([number,title,copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className={styles.easting} id="73-easting">
        <figure><img src="/military-systems/cards/73-easting-horizontal-v1.1.webp" alt="The 73 Easting landscape card showing armored formations divided by a map grid line" width={1024} height={683}/></figure>
        <div><p className={styles.eyebrow}>26 FEBRUARY 1991 · 2D ACR</p><h2>A grid line became<br/><em>a battle name.</em></h2><p>Official U.S. Army histories place the 2d Armored Cavalry Regiment at the front of VII Corps’ advance, fighting Iraqi forces associated with the Tawakalna and 12th Armored Divisions. The card follows reconnaissance, weather, training, command, sustainment, opposition, and passage of lines—then refuses to stop at tactical victory.</p><dl><div><dt>Historical identity</dt><dd>2d Armored Cavalry Regiment (2d ACR), 1991</dd></div><div><dt>Source boundary</dt><dd>Official-U.S.-source heavy; Iraqi, civilian, regional, environmental, and independent perspectives remain explicit debt.</dd></div><div><dt>Question</dt><dd>What disappears when the action ends at tactical victory?</dd></div></dl><a href="/military-systems/73-EASTING-CASE-NOTE.md">Read the source-bounded case note ↗</a></div>
      </section>

      <section className={styles.continuation}>
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>THE SYSTEM AFTER THE SYSTEM</p><h2>Service continues.<br/><em>So must responsibility.</em></h2><p>Veteran is a status and a field of situated experiences—not one archetype. The graph keeps service, health, benefits, work, family, grief, humor, purpose, and memory connected while preserving privacy and participant authority.</p></div>
        <div className={styles.continuationCards}>
          <article><img src="/military-systems/cards/service-continues-vertical-v1.1.webp" alt="Service Continues card" width={683} height={1024}/><small>VETERANS</small><h3>The institution stops carrying. Life does not.</h3></article>
          <article><img src="/military-systems/cards/gulf-war-illness-vertical-v1.1.webp" alt="Gulf War Illness card" width={683} height={1024}/><small>GULF WAR ILLNESS</small><h3>Uncertainty is not permission to dismiss the person.</h3></article>
          <article><img src="/military-systems/cards/va-navigation-vertical-v1.1.webp" alt="Different Doors VA navigation card" width={683} height={1024}/><small>VA NAVIGATION</small><h3>Registry, care, referral, benefits, and crisis are different doors.</h3></article>
        </div>
      </section>

      <section className={styles.cards} id="cards">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>THE FIRST FIELD DECK</p><h2>Eight cards.<br/><em>Two ways into each.</em></h2><p>Portrait favors focal identity. Landscape reveals relation, passage, and consequence. Open any card for its moving directions, four-stage capability, and smallest live question.</p></div>
        <MilitaryCardLibrary/>
      </section>

      <section className={styles.crisis}>
        <div><small>VETERANS CRISIS LINE · CURRENT U.S. HANDOFF</small><h2>Connection creates time.</h2><p>If this page matters because a Veteran may be in immediate danger or thinking about suicide, stop the reading and connect to qualified help now.</p></div>
        <div><a href="tel:988">Call 988, then press 1</a><a href="sms:838255">Text 838255</a><a href="https://www.veteranscrisisline.net/get-help-now/chat/">Open official chat ↗</a><p>In immediate danger, call 911 or go to the nearest emergency department.</p></div>
      </section>

      <section className={styles.sources} id="sources">
        <div><p className={styles.eyebrow}>INSPECTABLE BY DESIGN</p><h2>Claims keep their<br/>sources and limits.</h2><p>The page uses current official sources for Gulf War illness terminology, VA pathways, Vet Center eligibility, and crisis support. “Gulf War Syndrome” remains searchable, but the display follows current VA language: Gulf War illness.</p></div>
        <div className={styles.sourceLinks}><a href="/military-systems/VETERAN-VA-GULF-WAR-SOURCE-NOTE.md"><small>VETERAN · VA · GULF WAR</small><b>Current-source note</b><span>Terminology, registry, care, benefits, WRIISC, Vet Centers, suicide prevention, and freshness.</span></a><a href="/military-systems/data/engine-project-v1.3.json"><small>GRAPH-NATIVE TRANSPORT</small><b>Engine 1.3 project</b><span>20 nodes, 19 typed relations, claims, sources, card expressions, profiles, Realms, and Sentinel handoffs.</span></a><a href="/downloads/Mapshifting-Military-Systems-Web-v1.1.0.zip" download><small>PORTABLE WEB EDITION</small><b>Military Systems v1.1.0</b><span>Graph transport, card manual, source notes, and all sixteen web card artworks.</span></a></div>
      </section>

      <section className={styles.disclaimer}><p>Historical, educational, symbolic, and reflective—not military advice, tactical instruction, diagnosis, treatment, crisis response, legal advice, or a VA eligibility determination. Current decisions require authorized institutions and qualified people.</p></section>
    </main>
    <footer className={styles.footer}><img src="/assets/kiduna/mark.svg" alt="" width={28} height={28}/><p>Purpose, force, sustainment, consequence, care, and return—held in one living graph.</p><Link href="/">Kiduna.design →</Link></footer>
  </div>;
}
