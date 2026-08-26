"use client";

import { useMemo, useState } from "react";
import cards from "./cards.generated.json";
import styles from "./real-estate.module.css";

type Card = (typeof cards)[number];
const PAGE = 36;
const families = Array.from(new Set(cards.map((card) => card.family))).sort();

export default function RealEstateLibrary() {
  const [family, setFamily] = useState("All families");
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState("All tones");
  const [shown, setShown] = useState(PAGE);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (cards as Card[]).filter((card) => {
      const familyMatch = family === "All families" || card.family === family;
      const toneMatch = tone === "All tones" || card.tone === tone;
      const searchable = [card.name, card.family, card.kind, card.what_it_is, card.what_it_actually_does, card.essence, card.archetype, card.gift, card.wound_shadow, card.divination, card.question, card.guidance, card.historical_lineage].join(" ").toLowerCase();
      return familyMatch && toneMatch && (!needle || searchable.includes(needle));
    });
  }, [family, query, tone]);

  const resetWindow = () => setShown(PAGE);

  return <div className={styles.library}>
    <div className={styles.libraryTools}>
      <label><span>Search all 659 tiles</span><input type="search" value={query} onChange={(event)=>{setQuery(event.target.value);resetWindow();}} placeholder="home, liquidity, easement, foreclosure…"/></label>
      <label><span>Family</span><select value={family} onChange={(event)=>{setFamily(event.target.value);resetWindow();}}><option>All families</option>{families.map((item)=><option key={item}>{item}</option>)}</select></label>
      <label><span>Emotional register</span><select value={tone} onChange={(event)=>{setTone(event.target.value);resetWindow();}}><option>All tones</option><option value="life-light">Life-light</option><option value="warning">Warning</option></select></label>
      <p aria-live="polite"><b>{visible.length}</b> matching tiles</p>
    </div>

    <div className={styles.tileGrid}>
      {visible.slice(0,shown).map((card)=><details className={styles.tile} id={card.slug} key={card.id} data-tone={card.tone}>
        <summary>
          <div className={styles.tileFace}><img src={card.featuredArtwork || card.artwork} alt={`${card.name} luminous enamel tile`} width={1024} height={1024} loading="lazy" decoding="async"/><span>{card.tone === "warning" ? "Warning register" : "Life-light register"}</span></div>
          <div className={styles.tileIntro}><small>{card.number} · {card.family}</small><h3>{card.name}</h3><p>{card.essence}</p><b>Open complete tile <i aria-hidden="true">＋</i></b></div>
        </summary>
        <div className={styles.tileBody}>
          <section className={styles.definition}><div><small>WHAT IT IS</small><p>{card.what_it_is}</p></div><div><small>WHAT IT ACTUALLY DOES</small><p>{card.what_it_actually_does}</p></div><div><small>WHY IT EXISTS</small><p>{card.why_it_exists}</p></div></section>
          <section className={styles.polarity}><div><small>ARCHETYPE</small><h4>{card.archetype}</h4></div><div><small>GIFT</small><p>{card.gift}</p></div><div><small>WOUND / SHADOW</small><p>{card.wound_shadow}</p></div><div><small>FAILURE MODE</small><p>{card.failure_mode}</p></div></section>
          <section className={styles.meanings}><div><small>PERSONAL</small><p>{card.personal_meaning}</p></div><div><small>BUSINESS</small><p>{card.business_meaning}</p></div><div><small>FINANCIAL</small><p>{card.financial_meaning}</p></div><div><small>PROPERTY</small><p>{card.property_meaning}</p></div><div><small>COMMUNITY</small><p>{card.community_meaning}</p></div></section>
          <section className={styles.reading}><small>DIVINATION</small><p>{card.divination}</p><div><p><b>Question</b>{card.question}</p><p><b>Guidance</b>{card.guidance}</p></div></section>
          <section className={styles.meta}><div><small>WHO USES IT</small><p>{card.who_uses_it.join(" · ")}</p></div><div><small>DEPENDENCIES</small><p>{card.dependencies.join(" · ")}</p></div><div><small>GRAPH</small><p>{card.relationshipCount} direct typed relationships</p></div><div><small>ERA</small><p>{card.era}</p></div></section>
          <section className={styles.lineage}><small>LINEAGE + REGULATORY CONTEXT</small><p>{card.historical_lineage}</p><p>{card.regulatory_context}</p></section>
        </div>
      </details>)}
    </div>

    {!visible.length ? <div className={styles.empty}><b>No tile meets that combination.</b><p>Try a broader word or return to all families and tones.</p></div> : null}
    {shown < visible.length ? <button className={styles.more} type="button" onClick={()=>setShown((value)=>value+PAGE)}>Reveal {Math.min(PAGE,visible.length-shown)} more tiles</button> : null}
  </div>;
}
