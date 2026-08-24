import type { Metadata } from "next";
import Link from "next/link";
import TaoCardLibrary from "./TaoCardLibrary";
import styles from "./tao.module.css";

export const metadata: Metadata = {
  title: "The Tao — Enamel Oracle System",
  description: "A complete 75-tile enamel cosmology of source, polarity, transformation, relation, and return.",
  openGraph: {
    title: "The Tao — Enamel Oracle System",
    description: "Seventy-five symbolic windows into the movement of reality, connected by 302 typed relationships.",
    images: ["/tao/tao-enamel-proof-sheet.png"],
  },
};

const levels = [
  ["01", "The Source", "10 tiles", "Tao, Wu, Being, Non-Being, One, Two, the ten thousand things, Return, Emptiness, and Mystery. The most spacious faces hold the deepest principles."],
  ["02", "The Great Polarity", "14 memberships", "Seven complementary pairs reveal yin and yang as tendencies within change—not moral teams, personalities, or permanent identities."],
  ["03", "The Five Phases", "5 processes", "Wood, Fire, Earth, Metal, and Water generate and regulate one another as a living cycle rather than a set of static substances."],
  ["04", "The Eight Trigrams", "8 structures", "Exact three-line geometry becomes heaven, earth, thunder, wind, water, fire, mountain, and lake: the architectural backbone of the system."],
  ["05", "The Living Patterns", "40 tiles", "Practice and natural image make the cosmology encounterable through vessels, valleys, roots, weather, animals, seasons, silence, sound, shadow, and reflection."],
];

const phases = [
  ["木", "Wood", "Spring · East", "Rising and spreading", "Generates Fire · Controls Earth"],
  ["火", "Fire", "Summer · South", "Rising and radiating", "Generates Earth · Controls Metal"],
  ["土", "Earth", "Transitions · Center", "Centering and transforming", "Generates Metal · Controls Water"],
  ["金", "Metal", "Autumn · West", "Contracting and condensing", "Generates Water · Controls Wood"],
  ["水", "Water", "Winter · North", "Descending and storing", "Generates Wood · Controls Fire"],
];

const trigrams = [
  ["☰", "Qian", "Heaven", "solid · solid · solid", "Creative"],
  ["☷", "Kun", "Earth", "broken · broken · broken", "Receptive"],
  ["☳", "Zhen", "Thunder", "solid · broken · broken", "Arousing"],
  ["☴", "Xun", "Wind / Wood", "broken · solid · solid", "Penetrating"],
  ["☵", "Kan", "Water / Ravine", "broken · solid · broken", "Passage through danger"],
  ["☲", "Li", "Fire / Sun", "solid · broken · solid", "Illuminating"],
  ["☶", "Gen", "Mountain", "broken · broken · solid", "Keeping still"],
  ["☱", "Dui", "Lake / Marsh", "solid · solid · broken", "Opening exchange"],
];

export default function TaoPage() {
  return (
    <div className={styles.tao}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/"><img src="/assets/kiduna/mark.svg" alt="" width={32} height={32}/><span><b>Kiduna</b><small>Design systems</small></span></Link>
        <nav aria-label="Tao system navigation"><a href="#cosmology">Cosmology</a><a href="#cycles">Cycles</a><a href="#tiles">75 tiles</a><a href="#library">Library</a></nav>
        <Link className={styles.back} href="/">All systems ←</Link>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>A COMPLETE ENAMEL COSMOLOGY</p>
            <span className={styles.release}>System 12 · First edition · 24 August 2026</span>
            <h1>The <em>Tao</em></h1>
            <p className={styles.lede}>Seventy-five small enamel windows into the movement of reality—where form and emptiness, stillness and motion, yielding and resistance continually become one another.</p>
            <blockquote>“The Tao is not a set of answers. It is the pattern through which opposites continually become one another.”</blockquote>
            <div className={styles.actions}><a className={styles.primaryButton} href="#tiles">Enter the 75 tiles</a><a href="/downloads/Tao-Enamel-Oracle-Complete-v1.0.0.zip" download>Download complete system ↓</a></div>
            <div className={styles.metrics}><div><b>75</b><span>unique tiles</span></div><div><b>5</b><span>cosmological levels</span></div><div><b>302</b><span>typed relations</span></div></div>
          </div>
          <figure className={styles.heroArt}>
            <span className={styles.orbitOne}/><span className={styles.orbitTwo}/>
            <img src="/tao/tao-enamel-proof-sheet.png" alt="Nine enamel oracle tiles showing Tao, Wu Wei, an empty vessel, water, mountain, return, Qian, Kun, and Wood" width={1254} height={1254}/>
            <figcaption><b>Material proof</b><span>Nine faces establish void, line, enamel, and asymmetry.</span></figcaption>
          </figure>
        </section>

        <section className={styles.principle} id="cosmology">
          <div><p className={styles.eyebrow}>THE GOVERNING PRINCIPLE</p><h2>No fixed answer.<br/><em>A living relation.</em></h2></div>
          <p>Every tile carries one capacity through Gift, Shadow, Excess, Deficiency, and Return. Dark is not bad. Light is not good. Water nourishes and floods; Mountain shelters and obstructs. A reading asks what the force does here, at this intensity, for this duration, in relation to what.</p>
        </section>

        <section className={styles.levels}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>FIVE LEVELS</p><h2>From the unnamed source<br/>to the living image.</h2><p>The roster moves from cosmological depth into natural and practical encounter without flattening Taoism into a list of motivational concepts.</p></div>
          <div className={styles.levelGrid}>{levels.map(([number,name,count,copy]) => <article key={name}><span>{number}</span><small>{count}</small><h3>{name}</h3><p>{copy}</p><a href="#tiles">Open this family ↓</a></article>)}</div>
        </section>

        <section className={styles.cycles} id="cycles">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>TRANSFORMATION + STRUCTURE</p><h2>Five phases.<br/>Eight trigrams.</h2><p>Generation does not always help; it can overfeed. Control does not always harm; it can regulate. Trigram geometry is read bottom to top and generates the image rather than captioning it.</p></div>

          <div className={styles.phaseCycle} aria-label="Five Phase generating cycle">
            {phases.map(([mark,name,place,motion,relation], index) => <article key={name} data-phase={name.toLowerCase()}><span>{mark}</span><small>{String(index + 1).padStart(2,"0")} · {place}</small><h3>{name}</h3><p>{motion}</p><b>{relation}</b></article>)}
          </div>

          <div className={styles.trigramGrid}>{trigrams.map(([glyph,name,image,lines,motion]) => <article key={name}><span>{glyph}</span><div><small>{lines}</small><h3>{name} <i>— {image}</i></h3><p>{motion}</p></div></article>)}</div>
        </section>

        <section className={styles.tiles} id="tiles">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>THE COMPLETE TILE LIBRARY</p><h2>Every pattern,<br/><em>fully opened.</em></h2><p>Search across image, movement, gift, shadow, divination, question, action, and relation. Open any tile for the complete dossier; follow its edges to move through the cosmology.</p></div>
          <TaoCardLibrary/>
        </section>

        <section className={styles.graph}>
          <div><p className={styles.eyebrow}>THE RELATIONSHIP GRAPH</p><h2>The cards behave<br/>like the Tao.</h2><p>No tile stands alone. Every node transforms, balances, completes, supports, generates, controls, reflects, contains, or returns toward another. The graph is published in JSON and Graphviz formats so the system can become a reading interface, spatial map, game, or evolving knowledge object.</p><div className={styles.graphLinks}><a href="/tao/data/graph.json">Complete graph JSON ↗</a><a href="/tao/data/graph.dot">Graphviz DOT ↗</a></div></div>
          <div className={styles.graphDiagram} aria-label="Core Tao relationship backbone">
            <div className={styles.node}>Tao</div><i>→</i><div className={styles.node}>One</div><i>→</i><div className={styles.node}>Two</div><i>→</i><div className={styles.node}>Ten Thousand Things</div><i>↘</i><div className={`${styles.node} ${styles.returnNode}`}>Return</div>
            <span>Yin ⇄ Yang · Stillness ⇄ Movement · Water ⇄ Fire</span>
          </div>
        </section>

        <section className={styles.librarySection} id="library">
          <div><p className={styles.eyebrow}>COMPLETE WORKING LIBRARY</p><h2>Carry the whole system.</h2><p>The preserved edition includes the manual, all 75 individual Markdown tile records, visual grammar, generation prompt, full relationship graph, validation report, and the enamel proof sheet.</p></div>
          <div className={styles.downloads}>
            <a href="/downloads/Tao-Enamel-Oracle-Complete-v1.0.0.zip" download><small>COMPLETE EDITION · 2.9 MB</small><h3>Tao Enamel Oracle v1.0.0</h3><p>Every authored tile, manual chapter, graph record, production direction, source note, and visual proof.</p><b>Download ZIP ↓</b></a>
            <a href="/tao/TAO-ENAMEL-ORACLE-MANUAL.md"><small>READABLE SOURCE</small><h3>Complete Markdown manual</h3><p>Foundations, polarity, phases, trigrams, reading method, spreads, graph semantics, ethics, and visual philosophy.</p><b>Open manual ↗</b></a>
          </div>
        </section>

        <section className={styles.sources}>
          <p>This is a contemporary reflective oracle—not a recovered ancient deck, a substitute for the Yijing, or a complete representation of religious Daoism. Traditional anchors and contemporary synthesis are explicitly distinguished.</p>
          <div><a href="https://ctext.org/dao-de-jing/ens" target="_blank" rel="noreferrer">Laozi ↗</a><a href="https://ctext.org/book-of-changes/shuo-gua" target="_blank" rel="noreferrer">Discussion of the Trigrams ↗</a><a href="https://ctext.org/zhuangzi" target="_blank" rel="noreferrer">Zhuangzi ↗</a><a href="https://iep.utm.edu/wuxing/" target="_blank" rel="noreferrer">Wuxing orientation ↗</a></div>
        </section>
      </main>

      <footer className={styles.footer}><img src="/assets/kiduna/mark.svg" alt="" width={26} height={26}/><p>A set of small enamel windows into the movement of reality.</p><Link href="/">Kiduna.design →</Link></footer>
    </div>
  );
}
