import type { Metadata } from "next";
import { HubHeader } from "./ui/HubHeader";
import styles from "./hub.module.css";

export const metadata: Metadata = {
  title: "Kiduna Design — Conceptual Systems",
  description: "A home for Kiduna's conceptual interface systems and implementation-facing prototypes.",
};

export default function Home() {
  return <div className={styles.hub}>
    <HubHeader />
    <main>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>KIDUNA DESIGN · CONCEPTUAL PROTOTYPES</p>
        <h1>Eleven systems.<br /><span>Five living decks.</span></h1>
        <p className={styles.intro}>Explore Kiduna’s spatial language, the complete Royals &amp; Rogues game library, a build-ready system for alignment without obedience, Bellwether’s playable Level 1 reference world, symbolic maps of biology, culture, human-made systems, the Tao, political change, science-fiction disclosure inquiry, and the complete machinery of real estate and mortgage finance—plus three Mapshifting decks for reflection, discernment, and agency. These are design systems and working prototypes—not the production system.</p>
      </section>

      <section className={styles.systems} aria-label="Kiduna design systems">
        <article className={styles.systemCard}>
          <a className={styles.visual} href="/isometric" aria-label="Enter the Kiduna Isometric Scene System">
            <img src="/assets/isometric/observatory.png" alt="An isometric Kiduna observatory scene" />
            <span className={styles.number}>01</span>
            <span className={styles.status}>DESIGN SYSTEM</span>
          </a>
          <div className={styles.cardCopy}>
            <p>SPATIAL FOUNDATION</p>
            <h2>Isometric Scene System</h2>
            <span>A production-oriented visual constitution for geometry, light, materials, entities, portals, motion, schemas, and AI-generated Kiduna scenes.</span>
            <a className={styles.enter} href="/isometric">Enter the system <b>→</b></a>
          </div>
        </article>

        <article className={styles.systemCard}>
          <a className={styles.visual} href="/royals-and-rogues" aria-label="Enter Royals and Rogues">
            <img src="/assets/royals/key-art.png" alt="Four Royals and Rogues rivals gathered around an enamel gaming table" />
            <span className={styles.number}>02</span>
            <span className={styles.status}>GAME LIBRARY</span>
          </a>
          <div className={styles.cardCopy}>
            <p>CANONICAL GAME LIBRARY</p>
            <h2>Royals &amp; Rogues</h2>
            <span>The complete, traceable library connecting the original playable game to its final quiet-enamel digital system, rules, evidence, and developer kits.</span>
            <a className={styles.enter} href="/royals-and-rogues">Enter the library <b>→</b></a>
          </div>
        </article>

        <article className={styles.systemCard}>
          <a className={styles.visual} href="/coherence" aria-label="Enter Kiduna Coherence">
            <img src="/assets/coherence/coherence.jpg" alt="Kiduna Coherence alignment system with a target, tolerance band, and observed state" />
            <span className={styles.number}>03</span>
            <span className={styles.status}>ALIGNMENT SYSTEM</span>
          </a>
          <div className={styles.cardCopy}>
            <p>CONFIGURABLE ALIGNMENT</p>
            <h2>Kiduna Coherence</h2>
            <span>The complete system for defining legitimate desired states, measuring contextual drift and uncertainty, and selecting the least-forceful authorized response across Realms, Allies, Actors, and Avatars.</span>
            <a className={styles.enter} href="/coherence">Enter the system <b>→</b></a>
          </div>
        </article>

        <article className={styles.systemCard}>
          <a className={styles.visual} href="/bellwether" aria-label="Enter the Bellwether Reference Implementation">
            <img src="/assets/bellwether/bellwether-island.png" alt="Painterly aerial concept of Bellwether Island and its connected reference Scenes" />
            <span className={styles.number}>04</span>
            <span className={styles.status}>REFERENCE IMPLEMENTATION</span>
          </a>
          <div className={styles.cardCopy}>
            <p>PLAYABLE LEVEL 1 WORLD</p>
            <h2>Bellwether Reference Implementation</h2>
            <span>A build-ready Kiduna world with 17 connected Scenes, six Family Actors, quests, Projects, Portals, schemas, machine-readable data, validation, and a complete developer package.</span>
            <a className={styles.enter} href="/bellwether">Enter Bellwether <b>→</b></a>
          </div>
        </article>

        <article className={styles.systemCard}>
          <a className={styles.visual} href="/biology-deck" aria-label="Enter the Biology Deck">
            <img src="/assets/biology-deck/the-whole.png" alt="The Whole card from the Biology Deck" />
            <span className={styles.number}>05</span>
            <span className={styles.status}>SYMBOLIC SYSTEM</span>
          </a>
          <div className={styles.cardCopy}>
            <p>SYMBOLIC PHYSIOLOGY</p>
            <h2>Biology Deck</h2>
            <span>An 84-card symbolic physiology translating actual biological function into psychological, relational, archetypal, spiritual, and divinatory meaning.</span>
            <a className={styles.enter} href="/biology-deck">Enter the deck <b>→</b></a>
          </div>
        </article>

        <article className={styles.systemCard}>
          <a className={`${styles.visual} ${styles.popCultureVisual}`} href="/pop-culture-deck" aria-label="Enter the Pop Culture Deck">
            <div className={styles.popCultureScene} aria-hidden="true">
              <i className={styles.popOrbit} />
              <div className={styles.popCardOne}><small>ICON · I·01</small><b>WARHOL</b><span>SURFACE / SIGNAL</span></div>
              <div className={styles.popCardTwo}><small>FORCE · F·05</small><b>ECSTASY</b><span>SELF / CROWD</span></div>
              <strong>STILL<br />PLAYING.</strong>
            </div>
            <span className={styles.number}>06</span>
            <span className={styles.status}>CULTURAL SYSTEM</span>
          </a>
          <div className={styles.cardCopy}>
            <p>PLAYABLE MODERN MYTHOLOGY</p>
            <h2>Pop Culture Deck</h2>
            <span>A vast symbolic, divinatory, narrative, psychological, cultural, and game-ready map of modern consciousness: 210 complete cards, 800 evaluated candidates, lineages, spreads, games, sources, and machine-readable data.</span>
            <a className={styles.enter} href="/pop-culture-deck">Enter the deck <b>→</b></a>
          </div>
        </article>

        <article className={styles.systemCard}>
          <a className={styles.visual} href="/systems-oracle" aria-label="Enter the Systems Oracle">
            <img src="/systems-oracle-app/assets/references/reference-01.webp" alt="Systems Oracle enamel reference art" />
            <span className={styles.number}>07</span>
            <span className={styles.status}>SYMBOLIC SYSTEM</span>
          </a>
          <div className={styles.cardCopy}>
            <p>HUMAN-MADE SYSTEMS</p>
            <h2>Systems Oracle</h2>
            <span>A symbolic operating manual for the systems humans build: 360 canonical artifacts, lineages, relationships, spreads, games, and an enamel visual language.</span>
            <a className={styles.enter} href="/systems-oracle">Enter the oracle <b>→</b></a>
          </div>
        </article>

        <article className={styles.systemCard}>
          <a className={styles.visual} href="/tao" aria-label="Enter The Tao Enamel Oracle System">
            <img src="/tao/tao-enamel-proof-sheet.png" alt="Nine jewel-like enamel tiles from The Tao oracle system" />
            <span className={styles.number}>08</span>
            <span className={styles.status}>ORACLE SYSTEM</span>
          </a>
          <div className={styles.cardCopy}>
            <p>A COMPLETE ENAMEL COSMOLOGY</p>
            <h2>The Tao</h2>
            <span>Seventy-five symbolic windows into source, polarity, transformation, relation, and return—connected as one living graph rather than a deck of fixed answers.</span>
            <a className={styles.enter} href="/tao">Enter the system <b>→</b></a>
          </div>
        </article>

        <article className={styles.systemCard}>
          <a className={styles.visual} href="/political-change" aria-label="Enter the Political Change System">
            <img src="/political-change/enamel-triptych.png" alt="Enamel reference cards from the Political Change System" />
            <span className={styles.number}>09</span>
            <span className={styles.status}>LIVING SYMBOLIC SYSTEM</span>
          </a>
          <div className={styles.cardCopy}>
            <p>THE ARCHITECTURE OF POWER</p>
            <h2>Political Change</h2>
            <span>A nonpartisan symbolic map of how power is acquired, exercised, resisted, legitimized, disrupted, reformed, captured, distributed, and transformed.</span>
            <a className={styles.enter} href="/political-change">Enter the system <b>→</b></a>
          </div>
        </article>

        <article className={styles.systemCard}>
          <a className={styles.visual} href="/science-fiction-disclosure" aria-label="Enter the Science Fiction and Disclosure System">
            <img src="/science-fiction-disclosure/featured-enamel-network.png" alt="Five illuminated enamel inquiry tiles linked on an obsidian surface" />
            <span className={styles.number}>10</span>
            <span className={styles.status}>MAPSHIFTING SYSTEM</span>
          </a>
          <div className={styles.cardCopy}>
            <p>FICTION · CLAIM · SYMBOL · EVIDENCE</p>
            <h2>Science Fiction &amp; Disclosure</h2>
            <span>An evidence-aware map of science fiction, disclosure narratives, starseed cosmologies, speculative technology, high strangeness, and cultural meaning.</span>
            <a className={styles.enter} href="/science-fiction-disclosure">Enter the system <b>→</b></a>
          </div>
        </article>
        <article className={styles.systemCard}>
          <a className={styles.visual} href="/real-estate-mortgage" aria-label="Enter the Real Estate and Mortgage Enamel System">
            <img src="/real-estate-mortgage/enamel-life-light-sample-01.png" alt="Luminous enamel tiles expressing land, home, mortgage, liquidity, development, and belonging" />
            <span className={styles.number}>11</span>
            <span className={styles.status}>PROPERTY SYSTEM</span>
          </a>
          <div className={styles.cardCopy}>
            <p>LAND · SHELTER · CAPITAL · BELONGING</p>
            <h2>Real Estate &amp; Mortgage</h2>
            <span>A complete 659-tile enamel system connecting place, rights, title, mortgage finance, capital markets, development, construction, regulation, history, and lived consequence through 1,302 typed relationships.</span>
            <a className={styles.enter} href="/real-estate-mortgage">Enter the system <b>→</b></a>
          </div>
        </article>
      </section>

      <section className={styles.deckSection} id="mapshifting">
        <div className={styles.deckHeading}>
          <div><p>MAPSHIFTING DECKS</p><h2>Change the map.<br /><span>Recover a choice.</span></h2></div>
          <p>Mapshifting cards help a participant notice present conditions, shift perspective, and choose what happens next. They offer patterns and questions—not fixed prediction, diagnosis, or declarations of fate.</p>
        </div>
        <div className={styles.deckGrid}>
          <article className={styles.deckCard}>
            <a className={styles.deckVisual} href="/mapshifting/animal-deck"><img src="/mapshifting/animal/001-gray-wolf.jpg" alt="Gray Wolf card from the Mapshifting Animal Deck"/><span>01 · COMPLETE MANUAL</span></a>
            <div><h3>Animal Deck</h3><p>Sixty-eight living mirrors pairing verified animal behavior with Gifts, Wounds, practices, relationships, and cultural care.</p><b>68 species cards</b><a href="/mapshifting/animal-deck">Enter the deck →</a></div>
          </article>
          <article className={styles.deckCard}>
            <a className={styles.deckVisual} href="/mapshifting/nature-deck"><img src="/mapshifting/nature/046-watershed.jpg" alt="Watershed card from the Mapshifting Nature Deck calibration"/><span>02 · VISUAL CALIBRATION</span></a>
            <div><h3>Nature Deck</h3><p>Eighty-one patterns across nine scales—from photon to expanding universe—with nine illustrated calibration cards.</p><b>81 manual cards · 9 proofs</b><a href="/mapshifting/nature-deck">Enter the deck →</a></div>
          </article>
          <article className={styles.deckCard}>
            <a className={styles.deckVisual} href="/mapshifting/alchemy-deck"><img src="/mapshifting/alchemy/cards/card-050-master-landscape-w960.webp" alt="Master card from the Mapshifting Alchemy Deck"/><span>03 · COMPLETE VISUAL LIBRARY</span></a>
            <div><h3>Alchemy Deck</h3><p>Fifty alchemical identities across six visual families, each realized as an independent portrait card and landscape field.</p><b>50 cards · 100 finished works</b><a href="/mapshifting/alchemy-deck">Enter the deck →</a></div>
          </article>
        </div>
      </section>
    </main>
    <footer className={styles.footer}>
      <img src="/assets/kiduna/mark.svg" alt="" />
      <span>Kiduna Design</span>
      <small>Conceptual prototypes · not the production system</small>
    </footer>
  </div>;
}
