"use client";

import { useEffect, useState } from "react";
import "./gate-2b1.css";

type Scene = 0 | 1 | 2;
type ClinicSource = "operative" | "imaging" | "review";

const scenes = [
  {
    number: "01",
    short: "Inner Clinic",
    realm: "Inner Clinic",
    realmType: "Research + health Alliance",
    focus: "Understand documented post-surgery findings",
    persona: "Mara",
    privacy: "Patient–clinician Relationship",
  },
  {
    number: "02",
    short: "Nature of Work",
    realm: "The Nature of Work",
    realmType: "Transformation Program",
    focus: "Name what keeps blocking this decision",
    persona: "Avery",
    privacy: "Private reflection",
  },
  {
    number: "03",
    short: "2nd Cavalry",
    realm: "73 Easting Oral History",
    realmType: "Living-history Project",
    focus: "Record what the crew remembers",
    persona: "Ray",
    privacy: "Private interview draft",
  },
] as const;

const clinicSources = {
  operative: {
    kind: "AUTHORIZED RECORD",
    title: "Operative note",
    date: "14 June 2026 · 4:18 PM",
    issuer: "Dr. A. Shah · North River Surgical",
    detail: "Documents two biliary stents placed during the procedure and the anatomy observed by the surgical team.",
  },
  imaging: {
    kind: "AUTHORIZED RECORD",
    title: "Post-procedure imaging",
    date: "15 June 2026 · 9:42 AM",
    issuer: "North River Radiology",
    detail: "Documents the position of both stents on the first post-procedure image. This is not a prediction of outcome.",
  },
  review: {
    kind: "CLINICIAN INTERPRETATION",
    title: "Scene review note",
    date: "18 June 2026 · 2:06 PM",
    issuer: "Dr. A. Shah · treating clinician",
    detail: "Confirms that the scene is a faithful explanation of the issued records and identifies which anatomy remains illustrative.",
  },
} as const;

export default function Home() {
  const [scene, setScene] = useState<Scene>(0);
  const [embedded, setEmbedded] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [clinicSource, setClinicSource] = useState<ClinicSource | null>(null);
  const [portalReturned, setPortalReturned] = useState(false);
  const [natureGate, setNatureGate] = useState(false);
  const [natureSent, setNatureSent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [redacted, setRedacted] = useState(false);
  const [releaseGate, setReleaseGate] = useState(false);
  const [historySubmitted, setHistorySubmitted] = useState(false);
  const active = scenes[scene];

  useEffect(() => {
    const syncFromLocation = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedScene = Number(params.get("scene"));
      if (requestedScene === 0 || requestedScene === 1 || requestedScene === 2) setScene(requestedScene as Scene);
      setEmbedded(params.get("embed") === "1");
    }, 0);

    return () => window.clearTimeout(syncFromLocation);
  }, []);

  const moveScene = (next: Scene) => {
    setScene(next);
    setReviewOpen(false);
    setClinicSource(null);
  };

  return (
    <main className={`prototype-page realm-${scene} ${embedded ? "embedded-prototype" : ""}`}>
      <section className="review-rail" aria-label="Gate 2B.1 review controls">
        <div className="review-mark">
          <span className="review-kicker">GATE 2B.1</span>
          <span className="review-title">Primary Realm scenes</span>
          <span className="review-only">Review control · not product navigation</span>
        </div>
        <nav className="scene-nav" aria-label="Primary scenes">
          {scenes.map((item, index) => (
            <button
              key={item.number}
              className={`scene-tab ${scene === index ? "active" : ""}`}
              onClick={() => moveScene(index as Scene)}
              aria-current={scene === index ? "step" : undefined}
            >
              <span>{item.number}</span>{item.short}
            </button>
          ))}
        </nav>
        <button className="review-notes-button" onClick={() => setReviewOpen(true)}>
          <span aria-hidden="true">◇</span> Acceptance review
        </button>
      </section>

      <section className="studio-shell">
        <div className="ambient-light light-one" />
        <div className="ambient-light light-two" />

        <header className="studio-header">
          <div className="brand-lockup">
            <img src="/assets/kiduna-logo-linear-skyblue.svg" alt="Kiduna" />
          </div>

          <div className="realm-identity" aria-label={`Active Realm: ${active.realm}`}>
            <span className="realm-sigil" aria-hidden="true"><i /><b /></span>
            <span>
              <small>ACTIVE REALM</small>
              <strong>{active.realm}</strong>
              <em>{active.realmType}</em>
            </span>
          </div>

          <div className="header-presence">
            <span className="privacy-state"><i /> {active.privacy}</span>
            <button className="ki-presence" aria-label="Talk with Ki">
              <span className="ki-spark">✦</span>
              <span><strong>Ki</strong><small>with {active.persona}</small></span>
            </button>
            <button className="avatar" aria-label={`${active.persona}'s account`}>{active.persona[0]}</button>
          </div>
        </header>

        <div className="focus-bar">
          <span className="focus-label">CURRENT FOCUS</span>
          <strong>{active.focus}</strong>
          <span className="focus-thread"><i /> {active.persona} + Ki · one continuous conversation</span>
        </div>

        <section className="scene-viewport" key={scene}>
          {scene === 0 && (
            <ClinicScene
              selectedSource={clinicSource}
              onSource={setClinicSource}
              portalReturned={portalReturned}
              onPortal={() => setPortalReturned(true)}
            />
          )}
          {scene === 1 && (
            <NatureScene
              gateOpen={natureGate}
              sent={natureSent}
              onGate={() => setNatureGate(true)}
              onCancel={() => setNatureGate(false)}
              onSend={() => { setNatureSent(true); setNatureGate(false); }}
            />
          )}
          {scene === 2 && (
            <CavalryScene
              recording={recording}
              redacted={redacted}
              gateOpen={releaseGate}
              submitted={historySubmitted}
              onRecording={() => setRecording(!recording)}
              onRedact={() => setRedacted(!redacted)}
              onGate={() => setReleaseGate(true)}
              onCancel={() => setReleaseGate(false)}
              onSubmit={() => { setHistorySubmitted(true); setReleaseGate(false); setRecording(false); }}
            />
          )}
        </section>

        <Composer scene={scene} />

        <footer className="studio-footer">
          <span><b>✦</b> Ki is grounded in this Realm’s Wisdom, Stance, and authority</span>
          <span>Fictional review scenario · no live records</span>
        </footer>
      </section>

      {reviewOpen && <ReviewNotes scene={scene} onClose={() => setReviewOpen(false)} />}
    </main>
  );
}

function AttentionThread({ children }: { children: React.ReactNode }) {
  return (
    <div className="attention-thread" role="status">
      <span className="attention-pulse" aria-hidden="true" />
      <span>{children}</span>
      <small>Quiet Field activity · no action required</small>
    </div>
  );
}

function ClinicScene({
  selectedSource,
  onSource,
  portalReturned,
  onPortal,
}: {
  selectedSource: ClinicSource | null;
  onSource: (source: ClinicSource | null) => void;
  portalReturned: boolean;
  onPortal: () => void;
}) {
  return (
    <div className="conversation-scene clinic-scene">
      <AttentionThread>A new biliary-stent study is being checked; it does not change your documented record.</AttentionThread>

      <div className="message user-message">
        <div><span className="message-label">MARA · 8 MIN AGO</span><p>Help me understand what the surgeon found and what the stents are doing.</p></div>
        <span className="mini-avatar">M</span>
      </div>
      <div className="message ki-message">
        <span className="ki-node">✦</span>
        <div>
          <span className="message-label">KI · INNER CLINIC</span>
          <p>I can explain what your authorized records document. I cannot diagnose, predict your outcome, or fill gaps the records do not support. Dr. Shah has reviewed this bounded scene with you.</p>
        </div>
      </div>

      <article className="intelligence-stage clinic-stage">
        <header className="stage-header">
          <div>
            <span className="element-kind"><b>◎</b> CLINICIAN-REVIEWED SCENE · VERSION 3</span>
            <h1>Two documented stents, in context</h1>
            <p>Explanation of issued records—not a diagnosis or prognosis.</p>
          </div>
          <div className="review-seal">
            <span className="seal-mark">✓</span>
            <span><strong>Reviewed by Dr. A. Shah</strong><small>18 June 2026 · treating clinician</small></span>
          </div>
        </header>

        <div className="source-set" aria-label="Authorized Source set">
          <span className="object-index">01</span>
          <span className="source-set-title"><small>AUTHORIZED SOURCE SET</small><strong>3 dated records · patient permitted</strong></span>
          {(Object.keys(clinicSources) as ClinicSource[]).map((key) => (
            <button key={key} onClick={() => onSource(selectedSource === key ? null : key)} className={selectedSource === key ? "selected" : ""}>
              <span>{key === "operative" ? "▤" : key === "imaging" ? "◫" : "◇"}</span>
              <b>{clinicSources[key].title}</b>
              <small>{clinicSources[key].date.split(" · ")[0]}</small>
            </button>
          ))}
        </div>

        {selectedSource && (
          <div className="source-lens" role="region" aria-label={`${clinicSources[selectedSource].title} Source details`}>
            <div><span>{clinicSources[selectedSource].kind}</span><h3>{clinicSources[selectedSource].title}</h3></div>
            <p>{clinicSources[selectedSource].detail}</p>
            <small>{clinicSources[selectedSource].issuer} · {clinicSources[selectedSource].date}</small>
            <button onClick={() => onSource(null)} aria-label="Close Source details">×</button>
          </div>
        )}

        <div className="clinic-workspace">
          <div className="anatomy-scene" aria-label="Illustrative biliary anatomy with two documented stent positions">
            <div className="anatomy-orbit orbit-one" />
            <div className="anatomy-orbit orbit-two" />
            <div className="organ-form">
              <span className="organ-label">Illustrative anatomy</span>
              <div className="duct duct-main" />
              <div className="duct duct-branch" />
              <div className="stent stent-a"><i /><b>STENT 01</b></div>
              <div className="stent stent-b"><i /><b>STENT 02</b></div>
              <span className="unknown-zone"><i>?</i>Not represented</span>
            </div>
            <div className="scene-caption"><span>NOT TO SCALE</span><p>Positions are simplified from the 15 June image. Surrounding anatomy is generic.</p></div>
          </div>

          <div className="truth-layers">
            <span className="object-index">03</span>
            <div className="layer-row documented">
              <span className="layer-symbol">▤</span>
              <div><small>DOCUMENTED</small><strong>Two stents were placed</strong><p>Operative note · 14 June</p></div>
              <button onClick={() => onSource("operative")}>Open Source</button>
            </div>
            <div className="layer-row interpreted">
              <span className="layer-symbol">◇</span>
              <div><small>CLINICIAN INTERPRETATION</small><strong>Both positions match the record</strong><p>Dr. Shah · reviewed 18 June</p></div>
              <button onClick={() => onSource("review")}>Open review</button>
            </div>
            <div className="layer-row illustrative">
              <span className="layer-symbol">○</span>
              <div><small>ILLUSTRATIVE</small><strong>Surrounding anatomy is generic</strong><p>Helps orient; does not represent your body</p></div>
            </div>
            <div className="layer-row unknown">
              <span className="layer-symbol">?</span>
              <div><small>UNKNOWN / NOT REPRESENTED</small><strong>Outcome and undocumented findings</strong><p>Ask your clinician; Ki will not infer them</p></div>
            </div>
          </div>
        </div>

        <footer className="scene-record">
          <span className="object-index">02</span>
          <div className="record-fact"><i>✓</i><span><small>PATIENT CONSENT</small><strong>Granted for this explanation</strong></span></div>
          <div className="record-fact"><i>✓</i><span><small>CLINICIAN AUTHORITY</small><strong>Named review complete</strong></span></div>
          <div className="record-fact"><i>↺</i><span><small>CORRECTION</small><strong>Prior versions preserved</strong></span></div>
          <button className="portal-button" onClick={onPortal}>{portalReturned ? "Returned to record moment ✓" : "Return through Portal"}<span>→</span></button>
        </footer>
      </article>

      {portalReturned && <div className="continuity-receipt">Conversation, selected moment, questions, and Scene review Record preserved.</div>}
    </div>
  );
}

function NatureScene({
  gateOpen,
  sent,
  onGate,
  onCancel,
  onSend,
}: {
  gateOpen: boolean;
  sent: boolean;
  onGate: () => void;
  onCancel: () => void;
  onSend: () => void;
}) {
  return (
    <div className="conversation-scene nature-scene">
      <AttentionThread>The team’s decision experiment is ready for its steward; nothing has been executed.</AttentionThread>

      <div className="message user-message">
        <div><span className="message-label">AVERY · 5 MIN AGO</span><p>We keep reopening the same decision. I think people don’t know which concerns are safe to name.</p></div>
        <span className="mini-avatar">A</span>
      </div>
      <div className="message ki-message">
        <span className="ki-node">✦</span>
        <div>
          <span className="message-label">KI · PRIVATE TO AVERY</span>
          <p>That reflection stays here. I prepared a separate contribution that names the pattern without sharing this conversation or attributing it to you.</p>
        </div>
      </div>

      <article className="intelligence-stage learning-stage">
        <header className="stage-header">
          <div>
            <span className="element-kind"><b>⌁</b> COLLECTIVE LEARNING INSTRUMENT</span>
            <h1>From private insight to legitimate learning</h1>
            <p>Nothing crosses scope without a separate Artifact, terms, and acceptance.</p>
          </div>
          <span className="privacy-shield">◉ Private conversation protected</span>
        </header>

        <div className="learning-flow">
          <section className="private-reflection">
            <span className="object-index">01</span>
            <header><span className="lock-symbol">●</span><span><small>PRIVATE REFLECTION</small><strong>Only Avery and Ki</strong></span></header>
            <blockquote>“I think people don’t know which concerns are safe to name.”</blockquote>
            <p className="boundary-copy">Not an Organization Source. Managers, sponsors, Wizards, and the team cannot inspect this conversation.</p>
            <div className="scope-line"><span>Personal</span><span>Private</span><span>No organizational use</span></div>
          </section>

          <span className="flow-arrow" aria-hidden="true">→</span>

          <section className="contribution-envelope">
            <span className="object-index">02</span>
            <header><span className="artifact-symbol">▱</span><span><small>SEPARATE SHAREABLE ARTIFACT</small><strong>Pattern worth testing</strong></span></header>
            <blockquote>“Some concerns may be staying unspoken because the decision process does not yet make dissent safe.”</blockquote>
            <dl>
              <div><dt>Receiving scope</dt><dd>Transformation team</dd></div>
              <div><dt>Attribution</dt><dd>Group-cloaked</dd></div>
              <div><dt>Permitted use</dt><dd>Program learning only</dd></div>
              <div><dt>Retention</dt><dd>Review in 30 days</dd></div>
              <div><dt>Withdrawal</dt><dd>Until adopted synthesis</dd></div>
              <div><dt>Acceptance</dt><dd>Team learning steward</dd></div>
            </dl>
            {sent ? (
              <div className="compact-receipt"><i>✓</i><span><strong>Contribution offered</strong><small>Candidate only · receipt CL-208</small></span></div>
            ) : (
              <button className="primary-button" onClick={onGate}>Review contribution terms <span>→</span></button>
            )}
          </section>

          <span className="flow-arrow" aria-hidden="true">→</span>

          <section className="collective-synthesis">
            <span className="object-index">03</span>
            <header><span className="synthesis-symbol">◎</span><span><small>PROGRAM SYNTHESIS · DRAFT</small><strong>What this team may be learning</strong></span></header>
            <div className="coverage"><span><b>11</b> eligible contributions</span><span><b>3</b> excluded by scope</span><span><b>2</b> did not participate</span></div>
            <div className="finding"><small>SUPPORTED THEME</small><p>Decision authority is understood; the path for principled dissent is not.</p></div>
            <div className="finding dissent"><small>MINORITY / ALTERNATIVE</small><p>The recurring discussion may be necessary adaptation—not avoidance.</p></div>
            <div className="synthesis-limit">This does not represent “everyone.” Participation was optional; private reflections were not used.</div>
            <div className="authority-line"><span>◇</span><p><small>NEXT AUTHORITY</small><strong>Transformation team steward must accept any experiment</strong></p></div>
          </section>
        </div>

        {gateOpen && (
          <div className="action-gate">
            <span className="gate-symbol">◇</span>
            <div><small>CONFIRMED GATE · AVERY’S AUTHORITY</small><h3>Offer this separate Artifact to the team?</h3><p>The private conversation remains private. The contribution may be withdrawn until it enters an accepted synthesis.</p></div>
            <div className="gate-facts"><span>Team scope</span><span>Group-cloaked</span><span>30-day review</span></div>
            <div className="gate-actions"><button className="secondary-button" onClick={onCancel}>Keep private</button><button className="primary-button" onClick={onSend}>Offer contribution <span>→</span></button></div>
          </div>
        )}
      </article>
    </div>
  );
}

function CavalryScene({
  recording,
  redacted,
  gateOpen,
  submitted,
  onRecording,
  onRedact,
  onGate,
  onCancel,
  onSubmit,
}: {
  recording: boolean;
  redacted: boolean;
  gateOpen: boolean;
  submitted: boolean;
  onRecording: () => void;
  onRedact: () => void;
  onGate: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="conversation-scene history-scene">
      <AttentionThread>An official after-action report is linked as context; it will not correct or rewrite Ray’s memory.</AttentionThread>

      <div className="message user-message">
        <div><span className="message-label">RAY · 12 MIN AGO</span><p>I want to record what our crew remembers about 73 Easting before the anniversary.</p></div>
        <span className="mini-avatar">R</span>
      </div>
      <div className="message ki-message">
        <span className="ki-node">✦</span>
        <div>
          <span className="message-label">KI · ORAL HISTORY INTERVIEW</span>
          <p>Your words stay a private draft until you choose otherwise. I’ll help capture and organize them, but I won’t supply details or improve your memory.</p>
        </div>
      </div>

      <article className="intelligence-stage oral-stage">
        <header className="stage-header">
          <div>
            <span className="element-kind"><b>◉</b> ORAL HISTORY INTERVIEW · SAFE DRAFT</span>
            <h1>“What do you remember first?”</h1>
            <p>Ray controls the pace, sensitive passages, attribution, and release.</p>
          </div>
          <span className={`recording-state ${recording ? "live" : ""}`}><i /> {recording ? "Recording" : "Paused safely"} · 12:48</span>
        </header>

        <div className="oral-workspace">
          <section className="recording-object">
            <span className="object-index">01</span>
            <div className={`waveform ${recording ? "moving" : ""}`} aria-label={recording ? "Recording in progress" : "Recording paused"}>
              {[18, 31, 55, 23, 67, 40, 78, 34, 60, 24, 49, 72, 30, 58, 22, 44, 64, 28, 50, 20, 36, 61, 26, 48].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            </div>
            <div className="recording-meta"><span><small>ORIGINAL RECORDING</small><strong>73E_Ray_Interview_01.wav</strong></span><span><small>STATUS</small><strong>Private · encrypted draft</strong></span><span><small>CUSTODY</small><strong>Ray until submission</strong></span></div>
            <div className="record-controls">
              <button className="record-primary" onClick={onRecording}><span>{recording ? "Ⅱ" : "▶"}</span>{recording ? "Pause safely" : "Continue recording"}</button>
              <button onClick={onRedact}>▧ {redacted ? "Restore marked passage" : "Mark passage private"}</button>
              <button>↷ Skip this question</button>
              <button>□ Stop & keep draft</button>
            </div>
          </section>

          <section className="transcript-object">
            <span className="object-index">02</span>
            <header><span><small>DERIVATIVE · TRANSCRIPT V2</small><strong>Drafted from the original</strong></span><button>Open full transcript ↗</button></header>
            <p>“We were moving through the weather when the whole horizon seemed to change. What I remember first is checking where everyone was—not the map, the people.”</p>
            {redacted && <p className="redacted-line">▧ Passage marked private by Ray · excluded from release preview</p>}
            <div className="derivative-key"><span><i className="original" />Original audio</span><span><i className="derivative" />Transcript</span><span><i className="context" />Linked Source</span></div>
            <div className="related-source"><span>▤</span><p><small>RELATED CONTEXT · NOT A CORRECTION</small><strong>Official after-action report · retrieved 16 July 2026</strong></p><button>Inspect Source</button></div>
          </section>

          <section className="release-object">
            <span className="object-index">03</span>
            <header><span className="release-symbol">◇</span><span><small>CONTRIBUTION PREVIEW</small><strong>Ray’s release choices</strong></span></header>
            <dl>
              <div><dt>Attribution</dt><dd>Raymond “Ray” Cole</dd></div>
              <div><dt>Audience</dt><dd>2nd Cavalry members</dd></div>
              <div><dt>Permitted use</dt><dd>Oral history + anniversary</dd></div>
              <div><dt>Service verification</dt><dd>Archive steward only</dd></div>
              <div><dt>Sensitive passages</dt><dd>{redacted ? "1 withheld" : "None marked"}</dd></div>
              <div><dt>Withdrawal limit</dt><dd>Restrict future use after custody</dd></div>
            </dl>
            {submitted ? (
              <div className="custody-receipt"><i>✓</i><span><small>CUSTODY RECORD CREATED</small><strong>Original preserved · OH-73E-0048</strong><em>Transcript remains a correctable derivative.</em></span></div>
            ) : (
              <button className="primary-button" onClick={onGate}>Review release & custody <span>→</span></button>
            )}
          </section>
        </div>

        {gateOpen && (
          <div className="action-gate history-gate">
            <span className="gate-symbol">◇</span>
            <div><small>DELIBERATE GATE · RAY + ARCHIVE AUTHORITY</small><h3>Submit this testimony for member-only archival review?</h3><p>The archive steward may accept custody. Public release would require a separate Gate. Ray can stop now and keep the safe draft.</p></div>
            <div className="gate-facts"><span>Member-only</span><span>Original preserved</span><span>Corrections layered</span></div>
            <div className="gate-actions"><button className="secondary-button" onClick={onCancel}>Keep safe draft</button><button className="primary-button" onClick={onSubmit}>Submit to archive <span>→</span></button></div>
          </div>
        )}
      </article>
    </div>
  );
}

function Composer({ scene }: { scene: Scene }) {
  const placeholders = [
    "Ask Ki about a documented finding or Source…",
    "Continue privately, revise the contribution, or ask about the synthesis…",
    "Continue the memory, set a boundary, or ask about release…",
  ];

  return (
    <div className="composer-wrap">
      <div className="composer">
        <button className="attach-button" aria-label="Add a relevant Element">+</button>
        <input aria-label="Message Ki" placeholder={placeholders[scene]} />
        <span className="composer-context"><b>✦</b> Ki · grounded here</span>
        <button className="voice-button" aria-label="Use voice">⌁</button>
        <button className="send-button" aria-label="Send message">↑</button>
      </div>
    </div>
  );
}

const acceptance = [
  [
    "Inner Clinic and the patient-understanding Focus are visible immediately.",
    "One Realm; three elevated objects: Source set, review state, reviewed Scene.",
    "Documented, interpreted, illustrative, and unknown use labels and symbols—not color alone.",
    "Every represented patient finding reaches a dated authorized Source.",
    "Patient consent and Dr. Shah’s named review are visible before completion.",
    "Ki explicitly refuses diagnosis and prognosis; unrelated chart machinery stays hidden.",
    "Portal return visibly preserves conversation, selected moment, questions, and Record.",
  ],
  [
    "Private reflection and shareable Artifact are visibly separate objects and states.",
    "The private conversation names who cannot inspect it.",
    "Scope, attribution, use, retention, withdrawal, and receiving authority are reviewable.",
    "Synthesis states eligible coverage, exclusions, non-participation, and limits.",
    "A minority interpretation remains visible; Ki does not claim everyone agrees.",
    "The experiment cannot execute without the named team steward.",
    "No task board, sentiment chart, member score, or people grid appears.",
  ],
  [
    "Pause, continue, mark private, skip, and stop controls preserve a safe draft.",
    "Original audio, transcript derivative, and linked Source are visibly distinct.",
    "Release, attribution, audience, use, sensitive passages, and withdrawal limits are previewed.",
    "Ki refuses to supply or improve memory; verification remains purpose-specific.",
    "Related official material appears as context, not a correction.",
    "No confidential SADUNA launch, founder, legal, or financial detail appears.",
    "Submission creates a durable custody/provenance Record under named authority.",
  ],
] as const;

function ReviewNotes({ scene, onClose }: { scene: Scene; onClose: () => void }) {
  return (
    <div className="review-overlay" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <button className="overlay-backdrop" onClick={onClose} aria-label="Close acceptance review" />
      <aside className="review-panel">
        <header><div><span className="review-kicker">GATE 2B.1 EVIDENCE</span><h2 id="review-title">{scenes[scene].short}</h2><p>{scenes[scene].focus}</p></div><button onClick={onClose} aria-label="Close">×</button></header>
        <section>
          <span className="note-type inherited">INHERITED REQUIREMENTS</span>
          <ul><li>One active Realm, one current Focus, one dominant conversational surface.</li><li>Every Agent acts from an explicit Source of authority.</li><li>Privacy and visibility remain distinct; Connections do not grant authority.</li><li>Consequential Actions require their Gate and a durable Record.</li></ul>
        </section>
        <section>
          <span className="note-type accepted">OWNER-ACCEPTED CONSTRAINTS</span>
          <ul><li>The Gate 1 one-center shell continues without permanent navigation.</li><li>No more than three objects are elevated.</li><li>Only one quiet material Field signal may appear.</li><li>Operational machinery stays hidden unless trust or consequence requires it.</li></ul>
        </section>
        <section>
          <span className="note-type proposal">WORKING PROPOSALS UNDER TEST</span>
          <ul><li>The Realm-specific instrument shown here is fictional and behaviorally faithful.</li><li>Review controls above the Studio exist only for this local design study.</li><li>Terms such as Focus, Attention Thread, Lens, Stage, and Portal remain non-canonical design language.</li></ul>
        </section>
        <section>
          <span className="note-type criteria">MEASURABLE SCENE CHECK</span>
          <ul className="acceptance-list">{acceptance[scene].map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul>
        </section>
        <section>
          <span className="note-type taxonomy">TAXONOMY IMPACT</span>
          <p className="taxonomy-result"><strong>No taxonomy change.</strong> This pass tests non-canonical design patterns against Canonical Version 1.3.3 and introduces no new canonical decision.</p>
        </section>
        <footer><span>REVIEW QUESTION</span><p>Can you identify this Realm from its intelligence, contribution boundary, authority, and Record behavior—even without its name or accent?</p></footer>
      </aside>
    </div>
  );
}
