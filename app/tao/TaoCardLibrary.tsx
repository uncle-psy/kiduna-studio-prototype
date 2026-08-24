"use client";

import { useMemo, useState } from "react";
import cards from "./tao-cards.generated.json";
import styles from "./tao.module.css";

const families = ["All", "The Source", "The Great Polarity", "The Five Phases", "The Eight Trigrams", "The Living Patterns"] as const;
type Family = (typeof families)[number];
type Card = (typeof cards)[number];

function familyKey(card: Card) {
  const family = card.families[0];
  if (family === "The Source") return "source";
  if (family === "The Great Polarity") return "polarity";
  if (family === "The Five Phases") return "phase";
  if (family === "The Eight Trigrams") return "trigram";
  return "living";
}

function relationId(name: string) {
  return cards.find((card) => card.name === name)?.slug;
}

export default function TaoCardLibrary() {
  const [family, setFamily] = useState<Family>("All");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards.filter((card) => {
      const inFamily = family === "All" || card.families.includes(family);
      const searchable = [card.name, card.essence, card.image, card.movement, card.gift, card.shadow, card.divination, card.question, card.action, ...card.relations.map((relation) => relation.value)].join(" ").toLowerCase();
      return inFamily && (!needle || searchable.includes(needle));
    });
  }, [family, query]);

  return (
    <div className={styles.library}>
      <div className={styles.libraryTools}>
        <div className={styles.familyFilters} aria-label="Filter tiles by family">
          {families.map((item) => (
            <button key={item} type="button" aria-pressed={family === item} onClick={() => setFamily(item)}>
              {item === "All" ? "All tiles" : item.replace("The ", "")}
            </button>
          ))}
        </div>
        <label className={styles.search}>
          <span>Search the cosmology</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="water, return, boundary…" type="search" />
        </label>
        <p className={styles.resultCount} aria-live="polite"><b>{visible.length}</b> of 75 tiles</p>
      </div>

      <div className={styles.tileGrid}>
        {visible.map((card) => (
          <details className={styles.tile} id={card.slug} key={card.id} data-family={familyKey(card)}>
            <summary>
              <div className={styles.tileFace} aria-hidden="true">
                <i /><i /><i />
                {card.trigram.length ? <b>{card.trigram.find((item) => item.label === "Glyph")?.value}</b> : <b>○</b>}
              </div>
              <div className={styles.tileIntro}>
                <small>{card.number} · {card.families.join(" + ")}</small>
                <h3>{card.name}</h3>
                <p>{card.essence}</p>
                <span>Open complete tile <b aria-hidden="true">＋</b></span>
              </div>
            </summary>
            <div className={styles.tileBody}>
              <section className={styles.primaryReading}>
                <div><small>IMAGE</small><p>{card.image}</p></div>
                <div><small>MOVEMENT</small><p>{card.movement}</p></div>
                <div><small>DIVINATION</small><p>{card.divination}</p></div>
              </section>

              <section className={styles.polarityReading} aria-label={`${card.name} expressions`}>
                <div><small>GIFT</small><p>{card.gift}</p></div>
                <div><small>SHADOW</small><p>{card.shadow}</p></div>
                <div><small>EXCESS</small><p>{card.excess}</p></div>
                <div><small>DEFICIENCY</small><p>{card.deficiency}</p></div>
              </section>

              <section className={styles.returnReading}>
                <small>RETURN</small><h4>{card.return}</h4>
                <div><p><b>Question</b>{card.question}</p><p><b>Action</b>{card.action}</p></div>
              </section>

              {card.phase.length || card.trigram.length ? (
                <section className={styles.correspondences}>
                  <small>{card.phase.length ? "FIVE PHASE CORRESPONDENCES" : "TRIGRAM CORRESPONDENCES"}</small>
                  <dl>{[...card.phase, ...card.trigram].map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
                </section>
              ) : null}

              <section className={styles.relations}>
                <small>RELATIONS</small>
                <div>{card.relations.map((relation) => {
                  const target = relationId(relation.value);
                  return target ? <a href={`#${target}`} key={`${relation.label}-${relation.value}`}><span>{relation.label}</span><b>{relation.value}</b></a> : <span key={`${relation.label}-${relation.value}`}><i>{relation.label}</i><b>{relation.value}</b></span>;
                })}</div>
              </section>
            </div>
          </details>
        ))}
      </div>

      {!visible.length ? <div className={styles.empty}><b>No tile meets that pattern.</b><p>Try a broader word or return to all families.</p></div> : null}
    </div>
  );
}
