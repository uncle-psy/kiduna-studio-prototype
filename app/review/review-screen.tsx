"use client";

import Link from "next/link";
import { reviewPages, type ReviewPage } from "./review-data";
import styles from "./review.module.css";

function ReviewBar({ page }: { page: ReviewPage }) {
  const index = reviewPages.findIndex((item) => item.slug === page.slug);
  const previous = reviewPages[index - 1];
  const next = reviewPages[index + 1];

  return (
    <nav className={styles.reviewBar}>
      <Link href="/review" className={styles.reviewHome}>
        <img src="/kiduna-mark.svg" alt="" />
        <span>All screens</span>
      </Link>
      <label className={styles.screenPicker}>
        <small>{page.group}</small>
        <select
          aria-label="Choose a screen"
          value={page.slug}
          onChange={(event) => { window.location.href = `/review/${event.target.value}`; }}
        >
          {reviewPages.map((item) => (
            <option value={item.slug} key={item.slug}>{item.group} · {item.title}</option>
          ))}
        </select>
      </label>
      <div className={styles.pager}>
        {previous ? <Link href={`/review/${previous.slug}`} aria-label="Previous screen">←</Link> : <span>←</span>}
        <b>{index + 1} / {reviewPages.length}</b>
        {next ? <Link href={`/review/${next.slug}`} aria-label="Next screen">→</Link> : <span>→</span>}
      </div>
    </nav>
  );
}

export default function ReviewScreen({ page }: { page: ReviewPage }) {
  return (
    <div className={styles.screenPage}>
      <ReviewBar page={page} />
      <iframe
        className={styles.sourceFrame}
        src={`/review/screens${page.sourceRoute}`}
        title={`${page.title} source screen`}
      />
    </div>
  );
}
