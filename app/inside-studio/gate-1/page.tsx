"use client";

import { useEffect, useState } from "react";
import "./gate-1.css";

type Scene = 0 | 1 | 2;

const scenes = [
  { number: "01", short: "Calm start", title: "Return to the Realm" },
  { number: "02", short: "Schedule", title: "Prepare the steering group" },
  { number: "03", short: "Program", title: "Decide how the event opens" },
] as const;

const slots = [
  { id: "thu", day: "Thursday", date: "May 7", time: "10:00–10:45 AM", fit: "6 of 6 available", note: "Best fit" },
  { id: "fri", day: "Friday", date: "May 8", time: "9:30–10:15 AM", fit: "5 of 6 available", note: "Ana is tentative" },
  { id: "fri2", day: "Friday", date: "May 8", time: "2:30–3:15 PM", fit: "5 of 6 available", note: "Matt must leave at 3:15" },
] as const;

const sourceDetails = {
  report: {
    icon: "▤",
    kind: "PRIMARY SOURCE",
    title: "5th Infantry after-action report",
    detail: "National Archives · Record Group 94 · transcribed 12 May 2026",
    note: "Confirms the sequence of the opening artillery exchange and identifies the units present.",
  },
  map: {
    icon: "⌖",
    kind: "MAP",
    title: "Palo Alto battlefield map",
    detail: "National Park Service · updated 18 April 2026",
    note: "Used to ground the orientation and pronunciation of place names in the opening welcome.",
  },
  image: {
    icon: "▧",
    kind: "IMAGE",
    title: "Field sketch, 8 May 1846",
    detail: "Library of Congress · public domain scan",
    note: "Selected as the projected image behind the two-minute place acknowledgement.",
  },
} as const;

export default function Home() {
  const [scene, setScene] = useState<Scene>(0);
  const [embedded, setEmbedded] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("thu");
  const [scheduleGate, setScheduleGate] = useState(false);
  const [invitesSent, setInvitesSent] = useState(false);
  const [selectedSource, setSelectedSource] = useState<keyof typeof sourceDetails | null>(null);
  const [programGate, setProgramGate] = useState(false);
  const [recordCreated, setRecordCreated] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

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
  };

  return (
    <main className={`prototype-page ${embedded ? "embedded-prototype" : ""}`}>
      <section className="review-rail" aria-label="Gate 1 scene controls">
        <div className="review-mark">
          <span className="review-kicker">GATE 1</span>
          <span className="review-title">One-center shell</span>
          <span className="proposal-tag">Working proposal</span>
        </div>
        <nav className="scene-nav" aria-label="Experiment scenes">
          {scenes.map((item, index) => (
            <button
              key={item.number}
              className={`scene-tab ${scene === index ? "active" : ""}`}
              onClick={() => moveScene(index as Scene)}
              aria-current={scene === index ? "step" : undefined}
            >
              <span>{item.number}</span>
              {item.short}
            </button>
          ))}
        </nav>
        <button className="review-notes-button" onClick={() => setReviewOpen(true)}>
          <span aria-hidden="true">◇</span> Review notes
        </button>
      </section>

      <section className="studio-shell">
        <div className="ambient-light light-one" />
        <div className="ambient-light light-two" />

        <header className="studio-header">
          <div className="brand-lockup">
            <img src="/assets/kiduna-logo-linear-skyblue.svg" alt="Kiduna" />
          </div>

          <button className="realm-identity" aria-label="Palo Alto Commemoration Realm">
            <span className="realm-orbit" aria-hidden="true"><i /></span>
            <span>
              <strong>Palo Alto Commemoration</strong>
              <small>Event planning Realm</small>
            </span>
            <b aria-hidden="true">⌄</b>
          </button>

          <div className="header-presence">
            <span className="privacy-state"><span aria-hidden="true">●</span> Private Realm</span>
            <button className="ki-presence" aria-label="Talk with Ki">
              <span className="ki-spark">✦</span>
              <span><strong>Ki</strong><small>with you</small></span>
            </button>
            <button className="avatar" aria-label="David's account">D</button>
          </div>
        </header>

        <div className="thread-context">
          <span>DAVID + KI</span>
          <i />
          <span>OPENING COMMEMORATION</span>
          <i />
          <span>{scenes[scene].title}</span>
        </div>

        <section className="scene-viewport" key={scene}>
          {scene === 0 && <CalmStart onChoose={moveScene} />}
          {scene === 1 && (
            <ScheduleScene
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              gateOpen={scheduleGate}
              onGate={() => setScheduleGate(true)}
              invitesSent={invitesSent}
              onSend={() => { setInvitesSent(true); setScheduleGate(false); }}
              onCancel={() => setScheduleGate(false)}
            />
          )}
          {scene === 2 && (
            <ProgramScene
              selectedSource={selectedSource}
              onSource={setSelectedSource}
              gateOpen={programGate}
              onGate={() => setProgramGate(true)}
              recordCreated={recordCreated}
              onRecord={() => { setRecordCreated(true); setProgramGate(false); }}
              onCancel={() => setProgramGate(false)}
            />
          )}
        </section>

        <Composer scene={scene} />

        <footer className="studio-footer">
          <span><b>✦</b> Ki is grounded in this Realm</span>
          <span className="compute-pulse"><i /> Compute is healthy</span>
        </footer>
      </section>

      {reviewOpen && <ReviewNotes onClose={() => setReviewOpen(false)} />}
    </main>
  );
}

function CalmStart({ onChoose }: { onChoose: (scene: Scene) => void }) {
  return (
    <div className="calm-scene">
      <div className="orbital-emblem" aria-hidden="true">
        <span className="orbit orbit-a"><i /></span>
        <span className="orbit orbit-b"><i /></span>
        <span className="orbit-core">✦</span>
      </div>
      <div className="calm-copy">
        <p className="eyebrow">PALO ALTO COMMEMORATION</p>
        <h1>Good evening, David.</h1>
        <p className="scene-lede">What would you like to move forward?</p>
      </div>

      <div className="attention-brief">
        <div className="attention-heading">
          <span>Worth your attention</span>
          <small>Nothing is urgent</small>
        </div>
        <button className="attention-row primary" onClick={() => onChoose(2)}>
          <span className="attention-icon gold">◇</span>
          <span><strong>Choose how the event opens</strong><small>Matt added a bilingual welcome proposal</small></span>
          <span className="row-time">10 min</span>
          <b aria-hidden="true">→</b>
        </button>
        <button className="attention-row" onClick={() => onChoose(1)}>
          <span className="attention-icon blue">▦</span>
          <span><strong>Bring the steering group together</strong><small>Three times work before Friday</small></span>
          <span className="row-time">5 min</span>
          <b aria-hidden="true">→</b>
        </button>
        <div className="attention-row quiet">
          <span className="attention-icon cream">▤</span>
          <span><strong>Two new Sources are ready</strong><small>Matched to the program opening</small></span>
          <span className="row-time">Ready</span>
          <b aria-hidden="true">·</b>
        </div>
      </div>
    </div>
  );
}

function ScheduleScene({
  selectedSlot,
  onSelect,
  gateOpen,
  onGate,
  invitesSent,
  onSend,
  onCancel,
}: {
  selectedSlot: string;
  onSelect: (id: string) => void;
  gateOpen: boolean;
  onGate: () => void;
  invitesSent: boolean;
  onSend: () => void;
  onCancel: () => void;
}) {
  const choice = slots.find((slot) => slot.id === selectedSlot) ?? slots[0];

  return (
    <div className="conversation-scene">
      <div className="message user-message">
        <div><span className="message-label">YOU · JUST NOW</span><p>Find a time for the steering group before Friday and prepare the decision.</p></div>
        <span className="mini-avatar">D</span>
      </div>
      <div className="message ki-message">
        <span className="ki-node">✦</span>
        <div>
          <span className="message-label">KI</span>
          <p>I found three workable times. Thursday at 10:00 brings everyone together, so I prepared that as the strongest choice.</p>
        </div>
      </div>

      <article className="instrument schedule-instrument">
        <header className="instrument-header">
          <div>
            <span className="instrument-kind"><b>▦</b> SCHEDULING INSTRUMENT</span>
            <h2>Steering group conversation</h2>
            <p>Confirm the opening sequence and assign the remaining research.</p>
          </div>
          <span className="trust-chip"><b>◉</b> Availability only</span>
        </header>

        {invitesSent ? (
          <div className="receipt-card">
            <span className="receipt-icon">✓</span>
            <div>
              <span className="instrument-kind">RECORD CREATED · 4:42 PM</span>
              <h3>Six invitations sent for Thursday at 10:00 AM</h3>
              <p>The agenda and video room were included. You can change or cancel this meeting from its Record.</p>
              <button>Open meeting Record <span>→</span></button>
            </div>
          </div>
        ) : (
          <>
            <div className="schedule-layout">
              <div className="slot-list" role="radiogroup" aria-label="Suggested meeting times">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    role="radio"
                    aria-checked={selectedSlot === slot.id}
                    className={`slot ${selectedSlot === slot.id ? "selected" : ""}`}
                    onClick={() => onSelect(slot.id)}
                  >
                    <span className="radio-dot"><i /></span>
                    <span className="slot-date"><strong>{slot.day}</strong><small>{slot.date}</small></span>
                    <span className="slot-time"><strong>{slot.time}</strong><small>{slot.fit}</small></span>
                    <span className={`slot-note ${slot.id === "thu" ? "best" : ""}`}>{slot.note}</span>
                  </button>
                ))}
              </div>

              <aside className="agenda-preview">
                <span className="instrument-kind">PREPARED WITH THE TIME</span>
                <h3>Decision agenda</h3>
                <ol>
                  <li><span>01</span><p><strong>Opening welcome</strong><small>Choose language and voices</small></p></li>
                  <li><span>02</span><p><strong>Place acknowledgement</strong><small>Confirm historical framing</small></p></li>
                  <li><span>03</span><p><strong>Research owners</strong><small>Assign two open Sources</small></p></li>
                </ol>
                <div className="source-proof"><span>⌁</span><p><strong>Checked quietly</strong><small>6 connected schedules · Eastern time</small></p></div>
              </aside>
            </div>

            {gateOpen ? (
              <div className="action-gate">
                <div className="gate-icon">◇</div>
                <div className="gate-copy">
                  <span className="instrument-kind">ACTION GATE · YOUR AUTHORITY</span>
                  <h3>Send six invitations?</h3>
                  <p><b>{choice.day}, {choice.date} · {choice.time}</b> will be placed on the steering group’s calendars with the prepared agenda and meeting room.</p>
                  <div className="gate-facts"><span>Private to invitees</span><span>Reversible</span><span>No calendar details shared</span></div>
                </div>
                <div className="gate-actions">
                  <button className="secondary-button" onClick={onCancel}>Not yet</button>
                  <button className="primary-button" onClick={onSend}>Send invitations <span>→</span></button>
                </div>
              </div>
            ) : (
              <footer className="instrument-action">
                <div><span className="instrument-kind">PROPOSED ACTION</span><p>Send 6 invitations with the agenda and meeting room.</p></div>
                <button className="primary-button" onClick={onGate}>Review invitations <span>→</span></button>
              </footer>
            )}
          </>
        )}
      </article>
    </div>
  );
}

function ProgramScene({
  selectedSource,
  onSource,
  gateOpen,
  onGate,
  recordCreated,
  onRecord,
  onCancel,
}: {
  selectedSource: keyof typeof sourceDetails | null;
  onSource: (source: keyof typeof sourceDetails | null) => void;
  gateOpen: boolean;
  onGate: () => void;
  recordCreated: boolean;
  onRecord: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="conversation-scene program-scene">
      <div className="message user-message compact-message">
        <div><span className="message-label">YOU · 3 MIN AGO</span><p>Help Matt and me decide how the event should open.</p></div>
        <span className="mini-avatar">D</span>
      </div>
      <div className="message ki-message compact-message">
        <span className="ki-node">✦</span>
        <div><span className="message-label">KI</span><p>Matt’s proposal is consistent with the historical guidance. I brought the opening sequence and the three Sources that matter into focus.</p></div>
      </div>

      <article className="instrument element-stage">
        <header className="stage-header">
          <div>
            <span className="instrument-kind"><b>▱</b> ARTIFACT STAGE · PROGRAM V4</span>
            <h2>Opening sequence</h2>
          </div>
          <div className="stage-state"><i /> Draft · changed by Matt</div>
        </header>

        <div className="source-tray" aria-label="Attached Sources">
          <span className="tray-label">SOURCES IN THIS DECISION</span>
          {(Object.keys(sourceDetails) as Array<keyof typeof sourceDetails>).map((key) => {
            const source = sourceDetails[key];
            return (
              <button key={key} className={`source-element ${selectedSource === key ? "selected" : ""}`} onClick={() => onSource(selectedSource === key ? null : key)}>
                <span className="source-icon">{source.icon}</span>
                <span><small>{source.kind}</small><strong>{source.title}</strong></span>
                <b aria-hidden="true">↗</b>
              </button>
            );
          })}
        </div>

        {selectedSource && (
          <div className="source-lens">
            <button className="lens-close" onClick={() => onSource(null)} aria-label="Close Source preview">×</button>
            <span className="instrument-kind">{sourceDetails[selectedSource].kind} · VERIFIED PROVENANCE</span>
            <h3>{sourceDetails[selectedSource].title}</h3>
            <p>{sourceDetails[selectedSource].note}</p>
            <small>{sourceDetails[selectedSource].detail}</small>
          </div>
        )}

        <div className="program-workspace">
          <div className="program-timeline">
            <div className="program-row">
              <span className="program-time">00:00</span>
              <span className="program-marker complete">✓</span>
              <div><span className="program-type">ARRIVAL</span><h3>Gathering soundscape</h3><p>Wind, grass, and spoken place names lead guests into stillness.</p></div>
              <span className="duration">3 min</span>
            </div>
            <div className="program-row active">
              <span className="program-time">03:00</span>
              <span className="program-marker">02</span>
              <div><span className="program-type">WELCOME · PROPOSED CHANGE</span><h3>Two voices welcome the gathering</h3><p>David opens in English. Ana continues in Spanish, with neither framed as a translation of the other.</p></div>
              <span className="duration">4 min</span>
            </div>
            <div className="program-row">
              <span className="program-time">07:00</span>
              <span className="program-marker">03</span>
              <div><span className="program-type">PLACE</span><h3>Acknowledge the field</h3><p>The 1846 sketch appears while Matt names the people, stakes, and unfinished history of this place.</p></div>
              <span className="duration">2 min</span>
            </div>
          </div>

          <aside className="matt-proposal">
            <div className="contributor-line"><span className="matt-avatar">M</span><p><strong>Matt Simon</strong><small>Contributor · 22 min ago</small></p></div>
            <blockquote>“The two welcomes should stand beside each other—not one translating the other. That makes belonging part of the form, not just the message.”</blockquote>
            <div className="proposal-grounding"><span>✦</span><p><strong>Ki’s grounding</strong><small>Consistent with the Realm’s Stance and all 3 attached Sources.</small></p></div>
          </aside>
        </div>

        {recordCreated ? (
          <div className="receipt-card program-receipt">
            <span className="receipt-icon">✓</span>
            <div><span className="instrument-kind">RECORD CREATED · OPENING SEQUENCE V5</span><h3>Bilingual welcome accepted</h3><p>Accepted by David under project-editor authority. Matt’s proposal and all three Sources remain attached to the decision.</p></div>
            <button>Open decision Record <span>→</span></button>
          </div>
        ) : gateOpen ? (
          <div className="action-gate program-gate">
            <div className="gate-icon">◇</div>
            <div className="gate-copy">
              <span className="instrument-kind">ACTION GATE · ARTIFACT CHANGE</span>
              <h3>Accept Matt’s bilingual welcome?</h3>
              <p>This replaces the single-language welcome in Program V4. The prior version remains recoverable.</p>
              <div className="gate-facts"><span>Project editors</span><span>3 Sources attached</span><span>Reversible</span></div>
            </div>
            <div className="gate-actions">
              <button className="secondary-button" onClick={onCancel}>Keep reviewing</button>
              <button className="primary-button" onClick={onRecord}>Accept & create Record <span>→</span></button>
            </div>
          </div>
        ) : (
          <footer className="instrument-action stage-action">
            <div><span className="instrument-kind">YOUR DECISION</span><p>Matt’s change is ready. The current version will remain recoverable.</p></div>
            <button className="primary-button" onClick={onGate}>Review this change <span>→</span></button>
          </footer>
        )}
      </article>
    </div>
  );
}

function Composer({ scene }: { scene: Scene }) {
  const placeholder = scene === 0
    ? "Tell Ki what you want to move forward…"
    : scene === 1
      ? "Ask about the schedule or change the proposal…"
      : "Ask about the program, Matt’s proposal, or a Source…";

  return (
    <div className="composer-wrap">
      <div className="composer">
        <button className="attach-button" aria-label="Add an Element">+</button>
        <input aria-label="Message Ki" placeholder={placeholder} />
        <span className="composer-context"><b>✦</b> Ki · this Realm</span>
        <button className="voice-button" aria-label="Use voice">⌁</button>
        <button className="send-button" aria-label="Send message">↑</button>
      </div>
    </div>
  );
}

function ReviewNotes({ onClose }: { onClose: () => void }) {
  return (
    <div className="review-overlay" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <button className="overlay-backdrop" onClick={onClose} aria-label="Close review notes" />
      <aside className="review-panel">
        <header><div><span className="review-kicker">GATE 1 EVIDENCE</span><h2 id="review-title">What this experiment is testing</h2></div><button onClick={onClose} aria-label="Close">×</button></header>
        <section>
          <span className="note-type inherited">INHERITED REQUIREMENTS</span>
          <ul><li>Conversation with Ki is the primary interaction.</li><li>One active Realm, one current Focus, one dominant surface.</li><li>Connected systems stay quiet until their details matter.</li><li>Consequential Actions expose authority, a Gate, and a durable Record.</li></ul>
        </section>
        <section>
          <span className="note-type proposal">WORKING PROPOSALS</span>
          <ul><li>All three scenes use one Palo Alto Realm and one continuous thread.</li><li>Structured work unfolds as an inline instrument or Element Stage.</li><li>Collaborators appear through contribution and authority, not a permanent roster.</li><li>The Field/Atlas is absent from everyday work and remains a later experiment.</li></ul>
        </section>
        <section>
          <span className="note-type open">OPEN / MISSING EVIDENCE</span>
          <ul><li>The permanent top-level label—Chat, Work, or another term—remains open.</li><li>Lens versus Stage thresholds remain a proposal.</li><li>Canonical Taxonomy 1.3.1 Sections 1–18 are still needed before engineering handoff.</li></ul>
        </section>
        <footer><span>Review question</span><p>Does one conversational center remain clear as structured work becomes richer?</p></footer>
      </aside>
    </div>
  );
}
