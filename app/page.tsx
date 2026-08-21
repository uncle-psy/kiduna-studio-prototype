import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { counts } from "../lib/catalog";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <img className="hero-art" src="/assets/preview/key-art.png" alt="Four medieval rivals gather around an enamel gaming table" />
        <div className="hero-shade" />
        <Header />
        <div className="hero-copy">
          <p className="eyebrow">NO-LIMIT HOLD’EM, MAGICALLY TRANSFORMED</p>
          <h1>Play the hand.<br />Change the game.</h1>
          <p className="lede">The complete, traceable library connecting the original playable game to its final quiet-enamel digital system.</p>
          <div className="hero-actions">
            <a className="button primary" href="/cards">Explore the cards</a>
            <a className="button" href="/flow">Learn the game</a>
          </div>
        </div>
      </section>

      <section className="intro shell">
        <div>
          <p className="eyebrow">ONE GAME · THREE CONNECTED LAYERS</p>
          <h2>Original rules. Final art. Digital copy.</h2>
        </div>
        <p>Every record keeps the playable legacy card, its text-free enamel replacement, and the player-facing rules together—without baking copy into the artwork.</p>
      </section>

      <section className="number-band">
        <div className="shell stat-grid">
          <div><strong>{counts.gameplay}</strong><span>Playable records</span></div>
          <div><strong>{counts["confirmed-pair"]}</strong><span>Original-to-final pairs</span></div>
          <div><strong>{counts.sourceFiles}</strong><span>Inventoried source files</span></div>
          <div><strong>{counts.verificationPassed}/{counts.verificationChecks}</strong><span>Image checks passed</span></div>
        </div>
      </section>

      <section className="comparison shell" aria-labelledby="sample-title">
        <div className="comparison-copy">
          <p className="eyebrow">CONFIRMED PAIR · ROGUE</p>
          <h2 id="sample-title">Dramatic Reversal</h2>
          <p>Final art is preserved untouched. The original card remains beside it as evidence, while the digital interface carries the name, timing, and effect separately.</p>
          <dl>
            <div><dt>Timing</dt><dd>Round · Tilted</dd></div>
            <div><dt>Family</dt><dd>Rogue</dd></div>
            <div><dt>Status</dt><dd>Original and final linked</dd></div>
          </dl>
        </div>
        <figure className="card-figure final"><img src="/assets/preview/final-card.png" alt="Final text-free enamel artwork for Dramatic Reversal" /><figcaption>Final art</figcaption></figure>
        <figure className="card-figure legacy"><img src="/assets/preview/original-card.png" alt="Original playable Dramatic Reversal card" /><figcaption>Original card</figcaption></figure>
      </section>
      <section className="link-panels shell">
        <a href="/rules"><p className="eyebrow">PLAY</p><h2>Complete rules</h2><span>Read the reconstructed rules beside unresolved revisions.</span></a>
        <a href="/cards"><p className="eyebrow">EXPLORE</p><h2>Canonical library</h2><span>Search every card, component, identity, and state.</span></a>
        <a href="/downloads"><p className="eyebrow">BUILD</p><h2>Developer kits</h2><span>Download every section or the complete master package.</span></a>
      </section>
      <Footer />
    </main>
  );
}
