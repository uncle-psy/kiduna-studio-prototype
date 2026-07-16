import Image from "next/image";
import styles from "./record.module.css";

const phases = [
  {
    number: "01",
    title: "The spatial model",
    copy: "Translated the Spatial UI Domain Model, Surfaces Design Bible, and July 15 working-session notes into a sequence showing one member gathering two others, forming a community, opening a Project, bringing in artifacts, invoking an Actor, and accepting a cited change.",
    artifacts: ["Kidunaverse Spatial UI Domain Model.pdf", "Kiduna Surfaces Design Bible v0.1", "July 15 design-session notes"],
  },
  {
    number: "02",
    title: "A persistent prototype",
    copy: "Turned the screens into a continuous Studio Field. Identity is chosen before entry and stays fixed inside the session. The Field remains beneath focused conversations and artifacts; member-facing Transparency makes that relationship visible and adjustable.",
    artifacts: ["Next.js Studio surface", "Persistent workspace state", "Vercel production deployment"],
  },
  {
    number: "03",
    title: "Learning through rejection",
    copy: "A later visual direction broke the established language into disconnected panels. It was explicitly rejected and reverted. Faces were deferred. The restored system keeps espresso ground, Avenir body, Goudy display, sky interactions, restrained mint state, and gold only for signature-level acts.",
    artifacts: ["Rejected redesign preserved in Git history", "Full visual restoration", "No in-Field account switching"],
  },
  {
    number: "04",
    title: "The data foundation",
    copy: "Added PostgreSQL as the durable store, pgvector for Wisdom retrieval, and Apache AGE for graph development. Local development runs the combined stack; the hosted Neon database runs PostgreSQL plus pgvector, while AGE remains local until a compatible hosted graph runtime is chosen.",
    artifacts: ["PostgreSQL 16", "pgvector", "Apache AGE", "Drizzle schema", "Database health endpoint"],
  },
  {
    number: "05",
    title: "The Genesis opening",
    copy: "Rebuilt the beginning around the canonical Create from Within loop: a Persona, their Ally, and the ability to bring one more person in well. David enters a clear Field. Ki greets first. Organizations, people, and Projects only become visible as the conversation gives them meaning.",
    artifacts: ["Ki Stance v1.0", "Ki Wisdom corpus v2.5", "14 initial Ki Skills", "Conversation-driven Field states"],
  },
  {
    number: "06",
    title: "The experiential canon",
    copy: "Established a maintained canon layer that distinguishes exact owner-ratified language from evolving implementation guidance. The Inception Point, the Fertile Void, Ki’s dynamic nonhuman presence, the two-type chip grammar, Persona switching, voice presence, and member-controlled Transparency now share one reproducible system voice.",
    artifacts: ["System Canon v0.1", "Ki avatar glyph", "Maintain System Canon Skill", "Browser voice prototype", "David and Moto Personas"],
  },
  {
    number: "07",
    title: "Kinship becomes multi-user",
    copy: "Moved account access outside the Field and made the invitation path durable. Ki can now learn about any intended person, issue a bounded Kinship Code, preserve directional trust and lineage, verify a new member’s email, consume single-use Codes atomically, form the Relationship, and keep inviter belief separate from invitee self-description.",
    artifacts: ["Authenticated accounts and Personas", "Email verification", "Kinship Code design contract", "Relationship Wisdom namespaces", "Privacy-aware vector entries"],
  },
];

const architecture = [
  ["Surface", "Next.js 16 / React 19", "The interactive Studio Field and this record"],
  ["Stance", "Versioned system prompt", "Ki’s identity, authority boundary, voice, and response discipline"],
  ["Wisdom", "PostgreSQL + pgvector", "Provenance-preserving passages retrieved by meaning"],
  ["Skills", "15 Markdown skill packages", "Procedures for Field, identity, canon, organizations, relationships, Projects, Actions, Wisdom, Actors, and compute"],
  ["State", "PostgreSQL", "Prototype workspace state, messages, events, and receipts"],
  ["Graph", "Apache AGE locally", "Development path for Personas, Allies, Relationships, Organizations, Projects, Actions, and Records"],
  ["Hosting", "GitHub + Vercel + Neon", "Version history, continuous deployment, and hosted relational/vector data"],
];

export default function PrototypeRecordPage() {
  return <main className={styles.record}>
    <div className={styles.weather} aria-hidden="true" />
    <header className={styles.masthead}>
      <div className={styles.brand}><Image src="/kiduna-mark.svg" width={42} height={42} alt="" /><span><small>KIDUNA STUDIO</small><strong>Prototype Record</strong></span></div>
      <div><span>PRIVATE WORKING RECORD</span><time>Updated 16 July 2026</time></div>
    </header>

    <section className={styles.hero}>
      <span>RECORD · GENESIS SERIES 01</span>
      <h1>How we are making<br />Studio from within.</h1>
      <p>A living record of the source materials, decisions, reversals, infrastructure, and working artifacts behind the Kiduna Studio functional prototype.</p>
      <div><b>7</b><span>prototype phases</span><b>52</b><span>Ki source files</span><b>15</b><span>installed Skills</span><b>1</b><span>continuous Field</span></div>
    </section>

    <section className={styles.principles}>
      <span>WHAT CONTROLS THE WORK</span>
      <div>
        <article><b>01</b><h2>The Field is always present.</h2><p>Context changes Transparency—not whether the world exists. The Persona may always override it.</p></article>
        <article><b>02</b><h2>Conversation creates context.</h2><p>Ki is the initial interface. The world appears in response to intention, not navigation.</p></article>
        <article><b>03</b><h2>Prototype truth matters.</h2><p>Local outcomes may be simulated; identity, authority, receipts, and provenance are never fabricated.</p></article>
      </div>
    </section>

    <section className={styles.timeline}>
      <header><span>PROTOTYPE HISTORY</span><h2>What we have done</h2></header>
      {phases.map((phase) => <article key={phase.number}>
        <b>{phase.number}</b>
        <div><h3>{phase.title}</h3><p>{phase.copy}</p></div>
        <ul>{phase.artifacts.map((artifact) => <li key={artifact}>{artifact}</li>)}</ul>
      </article>)}
    </section>

    <section className={styles.system}>
      <header><span>CURRENT WORKING SYSTEM</span><h2>How it is assembled</h2><p>The prototype separates what Ki is, what Ki knows, how Ki works, and what the deterministic system records.</p></header>
      <div className={styles.systemTable}>
        {architecture.map(([layer, technology, purpose]) => <article key={layer}><b>{layer}</b><strong>{technology}</strong><p>{purpose}</p></article>)}
      </div>
    </section>

    <section className={styles.inventory}>
      <header><span>CANONICAL KI PACKAGE</span><h2>Materials now held in the prototype</h2></header>
      <div>
        <article><span>STANCE</span><h3>Functional prototype system prompt</h3><p>The trusted runtime contract, Source boundary, truth order, retrieval rules, permission language, response style, and simulation discipline.</p><small>content/ki/stance · v1.0</small></article>
        <article><span>WISDOM</span><h3>Genesis Ally complete operating knowledge</h3><p>The consolidated corpus is split by Markdown structure, preserves source file, source status, and heading path, and is ingested into pgvector for scoped retrieval.</p><small>content/ki/wisdom · v2.5</small></article>
        <article><span>SKILLS</span><h3>Fifteen installed procedures</h3><p>Prototype runtime, canon, Field rendering, protection, Ally identity, relationships, Organizations, Projects, Actions, Forums, Wisdom, connections, Actors, capabilities, and compute.</p><small>content/ki/skills · 15 packages</small></article>
        <article><span>CANON</span><h3>Maintained experiential overlay</h3><p>Owner-ratified phrases, evolving interaction guidance, Ki’s system voice, visual character, and dated propagation record—loaded after Stance without rewriting historical source packages.</p><small>ki-maintain-system-canon · v0.1</small></article>
      </div>
    </section>

    <section className={styles.boundary}>
      <span>WHAT IS REAL NOW · WHAT IS NEXT</span>
      <div><h2>Real now</h2><p>Multi-user accounts, password hashing, verified-email state, sessions, Persona context, Codes, use and time limits, lineage, directional trust, Relationship creation, distinct Wisdom perspectives, database retrieval, and deployment pipeline.</p></div>
      <div><h2>Simulated now</h2><p>Production cryptographic signatures, wallet authority, federated verification, Organization formation, Project creation, Actor invocation, and domain Actions beyond the prototype database.</p></div>
      <div><h2>Next</h2><p>Learn from real invitation use; deepen Ki’s relationship questions one decision at a time; then let the first real community, Project, and artifact emerge from authenticated multi-user context.</p></div>
    </section>

    <footer className={styles.footer}><Image src="/kiduna-mark.svg" width={32} height={32} alt="" /><p>This page is intentionally not linked from the demonstration. It is a working record, not a public product page.</p><span>studio prototype · updated 2026-07-16</span></footer>
  </main>;
}
