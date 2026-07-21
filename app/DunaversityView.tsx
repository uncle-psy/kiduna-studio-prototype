"use client";

import Link from "next/link";
import styles from "./dunaversity.module.css";

type Surface = "studio" | "live";

const walkthroughs = [
  { id: "the-field", code: "M0", label: "The Field", person: "Matt", initials: "MA", role: "Member", wisdom: 6 },
  { id: "create-course", code: "M1", label: "Create a course", person: "Aashik", initials: "AA", role: "Catalyst", wisdom: 14 },
  { id: "learn-contribute", code: "M2", label: "Learn & contribute", person: "Matt", initials: "MA", role: "Member", wisdom: 6 },
  { id: "catalyst-bench", code: "M3", label: "Catalyst’s bench", person: "Moto", initials: "MO", role: "Catalyst", wisdom: 14 },
  { id: "month-close", code: "M4", label: "Month Close", person: "Moto", initials: "MO", role: "Catalyst", wisdom: 14 },
  { id: "scene-portal", code: "M5", label: "Scene Portal", person: "Matt", initials: "MA", role: "Member", wisdom: 6 },
] as const;

export default function DunaversityView({ surface, view }: { surface: Surface; view: string }) {
  const active = walkthroughs.find((item) => item.id === view) ?? walkthroughs[0];
  return <div className={`${styles.previewGround} ${surface === "live" ? styles.liveGround : ""}`}>
    <section className={`${styles.app} ${surface === "live" ? styles.live : styles.studio}`}>
      <header className={styles.header}>
        <Link href={`/${surface}/the-field`} className={styles.brand}><i>◌</i><span><b>Dunaversity</b><small>Kiduna · the agentic internet</small></span></Link>
        <div className={styles.context}><span>Field</span><em>›</em><b>{active.label}</b><small>SIMULATED</small></div>
        <div className={styles.surfaceSwitch}><Link className={surface === "studio" ? styles.selectedSurface : ""} href={`/studio/${active.id}`}>Studio</Link><Link className={surface === "live" ? styles.selectedSurface : ""} href={`/live/${active.id}`}>Live</Link></div>
        <button className={styles.persona}><i>{active.initials}</i><span><b>{active.person}</b><small>{active.role}</small></span><em>⌄</em></button>
      </header>
      {surface === "live" && <nav className={styles.mobileWalkthroughs}>{walkthroughs.map((item) => <Link key={item.id} className={item.id === active.id ? styles.mobileActive : ""} href={`/live/${item.id}`}><small>{item.code}</small>{item.label}</Link>)}</nav>}
      <div className={styles.workspace}>
        {surface === "studio" && <LeftRail active={active.id} role={active.role} wisdom={active.wisdom} />}
        <main className={styles.main}>{renderWalkthrough(active.id)}</main>
        {surface === "studio" && <KiPanel person={active.person} role={active.role} wisdom={active.wisdom} />}
      </div>
      {surface === "live" && <nav className={styles.mobileDock}><button className={view === "the-field" ? styles.dockActive : ""}><i>◉</i>Field</button><button className={view !== "the-field" ? styles.dockActive : ""}><i>◇</i>Focus</button><button><i>≡</i>Records</button><button><i>{active.initials}</i>You</button></nav>}
    </section>
  </div>;
}

function LeftRail({ active, role, wisdom }: { active: string; role: string; wisdom: number }) {
  return <aside className={styles.leftRail}><div className={styles.railLabel}><span>WALKTHROUGHS</span><small>v0.1</small></div><nav>{walkthroughs.map((item) => <Link key={item.id} className={item.id === active ? styles.railActive : ""} href={`/studio/${item.id}`}><small>{item.code}</small><b>{item.label}</b><span>→</span></Link>)}</nav><button className={styles.records}><i>≡</i><span><b>Records</b><small>8 immutable entries</small></span><em>8</em></button><div className={styles.authority}><i>◇</i><span><small>AUTHORITY</small><b>Graph checked</b><p>{role} · {wisdom} Wisdom Items visible</p></span></div></aside>;
}

function KiPanel({ person, role, wisdom }: { person: string; role: string; wisdom: number }) {
  return <aside className={styles.kiPanel}><header><i>K</i><span><b>Ki</b><small>grounded · graph first</small></span><button aria-label="Voice with Ki">◉</button></header><div className={styles.kiMessage}><i>K</i><p>Welcome, {person}. Kinship Duna and Dunaversity are here. You’re a {role} in Dunaversity. What would you like to do?</p></div><div className={styles.graphCheck}><i>◇</i><p>Graph checked before retrieval<small>{wisdom} permitted Wisdom Items · ScriptedModel</small></p></div><form className={styles.kiInput} onSubmit={(event) => event.preventDefault()}><input aria-label="Message Ki" placeholder="Ask Ki or state an intention…"/><button type="button">＋</button><small>Ki sees permitted context only</small><button>↑</button></form></aside>;
}

function ViewLead({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <header className={styles.viewLead}><small>{eyebrow}</small><h1>{title}</h1><p>{body}</p></header>;
}

function renderWalkthrough(view: string) {
  if (view === "create-course") return <CreateCourse />;
  if (view === "learn-contribute") return <LearnContribute />;
  if (view === "catalyst-bench") return <CatalystBench />;
  if (view === "month-close") return <MonthClose />;
  if (view === "scene-portal") return <ScenePortal />;
  return <TheField />;
}

function TheField() {
  return <><ViewLead eyebrow="THE FIELD · READY" title="Where shall we begin?" body="Two Realms are present. Ki carries your identity, authority, and permitted Wisdom between them."/><div className={styles.realmGrid}><RealmCard number="01" kind="Genesis Organization" state="Ready" title="Kinship Duna" body="The genesis Realm. Lineage, founding authority, and shared treasury rules begin here." action="View Realm ↗"/><RealmCard number="02" kind="Organization" state="Operating" title="Dunaversity" body="Learning as living Wisdom: Programs, Movements, contribution, and recognition." action="Enter Realm →" primary/></div><article className={styles.recordStrip}><i>≡</i><span><small>IMMUTABLE RECORD</small><b>enter realm</b><em>Matt · Member · graph</em></span><button>Open 8 Records</button></article></>;
}

function RealmCard({ number, kind, state, title, body, action, primary = false }: { number: string; kind: string; state: string; title: string; body: string; action: string; primary?: boolean }) {
  return <article className={`${styles.realmCard} ${primary ? styles.realmPrimary : ""}`}><div className={styles.cardTop}><i>{number}</i><span>{kind}</span><em>● {state}</em></div><h2>{title}</h2><p>{body}</p><div className={styles.roleChips}><span>Matt</span><span>Member</span></div><button className={primary ? styles.primaryButton : ""}>{action}</button></article>;
}

function CreateCourse() {
  const path = ["Intent", "Draft", "Research", "QA / QC", "Publish"];
  return <><ViewLead eyebrow="AASHIK · LIVE → STUDIO" title="How to Be a Cricket Fan" body="From conversational intent to a public Program, with every state change recorded."/><div className={styles.livePath}><span>LIVE PATH</span><b>00:00</b><small>target &lt; 05:00</small></div><div className={styles.pathSteps}>{path.map((step, index) => <span key={step}><i>{index + 1}</i>{step}</span>)}</div><article className={styles.intentCard}><p><i>K</i>You want to make a course about <b>how to be a cricket fan</b>. Here is the smallest useful Program I can create.</p><div className={styles.detailGrid}><Detail label="Name" value="How to Be a Cricket Fan"/><Detail label="Handle · available" value="how-to-be-a-cricket-fan"/><Detail label="Stance" value="Template Stance"/><Detail label="Badge" value="Fan"/><Detail label="Enrollment" value="Open"/><Detail label="Authority" value="Catalyst · graph checked"/></div><button className={styles.primaryButton}>Create draft · Confirmed →</button></article></>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><small>{label}</small><b>{value}</b></div>; }

function LearnContribute() {
  return <><ViewLead eyebrow="MATT · LIVE" title="Learn, complete, contribute." body="The published course carries authority, classification, money, and Records into one learner journey."/><article className={styles.ledgerCard}><div className={styles.badgeCoin}>V</div><span><small>SEEDED</small><b>Veteran badge</b><em>PRIOR LEDGER ENTRY · SIMULATED</em></span><h2>100 <small>sim-USDC join</small></h2><strong>Settled</strong><div className={styles.hops}>{[["Lineage","30"],["Club","3"],["Admin","20"],["Treasury","47"]].map(([key,value]) => <div key={key}><small>{key}</small><b>{value}</b></div>)}</div><button>Inspect every hop in Records →</button></article><article className={styles.programCard}><div><small>Movement I</small><span>FAN</span><span>Public</span></div><h2>How to Be a Cricket Fan</h2><p>A living introduction to the rhythms, rituals, and shared intelligence of cricket.</p><div className={styles.programIssuer}><i>DA</i><span>Dunaversity<small>Open enrollment</small></span></div><button className={styles.primaryButton}>Enroll · Confirmed →</button></article></>;
}

function CatalystBench() {
  return <><ViewLead eyebrow="MOTO · STUDIO" title="The Catalyst’s bench" body="Shape Dunaversity through conversation, Wisdom, structure, scoped roles, and deliberate publication."/><span className={styles.realmState}>Realm · Operating</span><nav className={styles.benchNav}>{["Identity & Stance","Wisdom Drops","Structure","Contribution & Roles","Publish"].map((item,index)=><button key={item} className={index===0?styles.benchActive:""}><i>{index+1}</i>{item}</button>)}</nav><article className={styles.pinned}><small>PINNED ELEMENT · DECLARED INTENT</small><h2>Make education feel like entering a living field of practice.</h2><div><span>✓ Purpose named</span><span>✓ Audience named</span><span>○ Stance recorded</span><span>○ Public boundary previewed</span></div></article><div className={styles.benchGrid}><article><p><i>K</i><b>Three questions shaped this identity.</b><br/>Who is it for? What becomes possible here? What must never be traded away?</p><small>PROPOSED IDENTITY</small><h2>Dunaversity</h2><em>@dunaversity · available</em><p>A living field for learning through Wisdom, practice, and contribution.</p><button>View 2 name proposals</button></article><article><small>STANCE ARTIFACT</small><h2>Version 1.0</h2><span>Draft</span><blockquote>“Begin with lived experience. Name uncertainty. Treat every learner as a potential contributor to the Wisdom that follows.”</blockquote><div><small>3 interview answers</small><small>1 version</small><small>Graph-scoped</small></div><button className={styles.primaryButton}>Record Stance v1.0 →</button></article></div></>;
}

function MonthClose() {
  const events = [["01","Measure Compute","Development 62% · learning 38%","6,000"],["02","Allocate to Programs","Mastering Agency 55% · Cricket Fan 45%","3,300 / 2,700"],["03","Catalyst payback first","Mastering Agency Squad-sim wallet","−1,400"],["04","Apply split rule","Moto 950 · Luminaries 570 · contribution pool 380","1,900"],["05","Close and Record","Every hop written · balances reconciled","0 variance"]];
  return <><ViewLead eyebrow="MONTH CLOSE · SIMULATED" title="Money as a walk of facts." body="Compute determines Program allocation. Payback comes first. Every hop carries its rule and Record."/><div className={styles.treasury}><span>TREASURY REMAINDER</span><b>6,000</b><small>sim-USDC</small></div><div className={styles.computeSplit}><article><b>62%</b><span>Development Compute</span><small>310 model units · fixed sim rate</small></article><article><b>38%</b><span>Learning Compute</span><small>190 model units · fixed sim rate</small></article><article><small>DETERMINISTIC RULE</small><b>Treasury remainder → Programs pro-rata → Catalyst payback → Squad split</b><em>Probabilistic proposes; deterministic decides.</em></article></div><header className={styles.timelineLead}><small>EXECUTION TIMELINE</small><h2>Ready to walk the distribution.</h2><button className={styles.primaryButton}>Run Month Close →</button></header><div className={styles.eventGrid}>{events.map(([n,title,body,value])=><article key={n}><i>{n}</i><span><b>{title}</b><p>{body}</p></span><strong>{value}</strong><small>SIMULATED</small></article>)}</div></>;
}

function ScenePortal() {
  return <><ViewLead eyebrow="FLAME SCENE · PLACEHOLDER" title="A Portal into practice." body="Enter, walk, and exit. The Scene changes the rendering, never the Presence’s permissions."/><span className={styles.realmState}>Mastering Agency</span><article className={styles.portalCard}><div className={styles.portalGraphic}><i>↗</i></div><section><small>PORTAL · MASTERING AGENCY</small><h2>Practice presence in motion.</h2><p>A stubbed Scene host proving the boundary between a Realm and an embodied experience.</p><div className={styles.permission}><i>◇</i><span><small>PERMISSION CONTEXT</small><b>Matt · Member · unchanged</b></span></div><button className={styles.primaryButton}>Enter Scene through Portal →</button></section></article></>;
}
