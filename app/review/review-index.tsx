"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { reviewGroups, reviewPages, type ReviewGroup } from "./review-data";
import styles from "./review.module.css";

export default function ReviewIndex() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<ReviewGroup | "All">("All");
  const filtered = useMemo(() => reviewPages.filter((page) => {
    const matchesGroup = group === "All" || page.group === group;
    const haystack = `${page.title} ${page.slug}`.toLowerCase();
    return matchesGroup && haystack.includes(query.toLowerCase());
  }), [group, query]);

  return (
    <main className={styles.catalog}>
      <header className={styles.catalogHero}>
        <div className={styles.brandLine}>
          <img src="/kiduna-mark.svg" alt="" />
          <span>KIDUNA · SCREEN REVIEW</span>
          <em>ISOLATED PROTOTYPE</em>
        </div>
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.eyebrow}>Review library · v1</p>
            <h1>Every screen,<br /><i>one quiet place.</i></h1>
          </div>
          <div className={styles.heroIntro}>
            <p>Browse the supplied screens without accounts, passwords, codes, wallets, or live services. Sample records are used anywhere a detail page needs an ID.</p>
            <strong>{reviewPages.length} reviewable screens</strong>
          </div>
        </div>
      </header>

      <section className={styles.catalogBody}>
        <div className={styles.filters}>
          <label>
            <span>Find a screen</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages…" />
          </label>
          <div className={styles.groupFilters}>
            {(["All", ...reviewGroups] as const).map((item) => (
              <button className={group === item ? styles.selectedFilter : ""} key={item} onClick={() => setGroup(item)}>{item}</button>
            ))}
          </div>
        </div>

        <div className={styles.resultLine}><span>{filtered.length} screens</span><span>All links stay under /review</span></div>
        <div className={styles.pageGrid}>
          {filtered.map((page, index) => (
            <Link className={styles.pageCard} href={`/review/${page.slug}`} key={page.slug}>
              <span className={styles.cardIndex}>{String(index + 1).padStart(3, "0")}</span>
              <small>{page.group}</small>
              <h2>{page.title}</h2>
              <code>/review/{page.slug}</code>
              <b>Open screen <span>↗</span></b>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
