"use client";

import { useMemo, useState } from "react";
import { militaryCards } from "./military-cards";
import styles from "./military-systems.module.css";

const categories = ["All", "System", "Power", "Battle", "Veterans", "Care", "Crisis", "Families"];

export default function MilitaryCardLibrary() {
  const [category, setCategory] = useState("All");
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const visible = useMemo(
    () => militaryCards.filter((card) => category === "All" || card.category === category),
    [category],
  );

  return <div className={styles.library}>
    <div className={styles.libraryTools}>
      <div className={styles.filters} aria-label="Filter card field">
        {categories.map((item) => <button key={item} type="button" data-active={category === item} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <div className={styles.orientation} aria-label="Choose card orientation">
        <button type="button" data-active={orientation === "vertical"} onClick={() => setOrientation("vertical")}>Portrait</button>
        <button type="button" data-active={orientation === "horizontal"} onClick={() => setOrientation("horizontal")}>Landscape</button>
      </div>
    </div>

    <div className={styles.cardGrid} data-orientation={orientation}>
      {visible.map((card) => <details className={styles.card} key={card.slug} id={card.slug}>
        <summary>
          <div className={styles.cardImage}>
            <img src={`/military-systems/cards/${card.slug}-${orientation}-v1.1.webp`} alt={`${card.title} ${orientation} card artwork`} width={orientation === "vertical" ? 683 : 1024} height={orientation === "vertical" ? 1024 : 683} loading="lazy" decoding="async"/>
            <span>{card.number} · {card.category}</span>
          </div>
          <div className={styles.cardSummary}><small>{card.subtitle}</small><h3>{card.title}</h3><p>{card.kernel}</p><b>Open the complete card <i aria-hidden="true">＋</i></b></div>
        </summary>
        <div className={styles.cardBody}>
          <section className={styles.directions}>
            <div><small>Moving toward</small><p>{card.toward}</p></div>
            <div><small>Moving away</small><p>{card.away}</p></div>
          </section>
          <section className={styles.stages}>
            <div><b>01</b><small>Sense</small><p>{card.sense}</p></div>
            <div><b>02</b><small>Choose</small><p>{card.choose}</p></div>
            <div><b>03</b><small>Act</small><p>{card.act}</p></div>
            <div><b>04</b><small>Learn</small><p>{card.learn}</p></div>
          </section>
          <blockquote>{card.question}</blockquote>
          {card.slug === "connection-creates-time" ? <div className={styles.cardCrisis}><b>Need immediate support?</b><span>Call 988, then press 1 · Text 838255 · In immediate danger, call 911 or go to an ER.</span></div> : null}
        </div>
      </details>)}
    </div>
  </div>;
}
