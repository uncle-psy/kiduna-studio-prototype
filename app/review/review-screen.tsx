"use client";

import Link from "next/link";
import { useState } from "react";
import { reviewPages, type ReviewPage } from "./review-data";
import styles from "./review.module.css";

const onboardingCopy = [
  { eyebrow: "Let’s begin", heading: "Tell us a little about you.", copy: "This becomes the starting point for your Kiduna identity.", fields: ["First name", "Email address"], action: "Continue" },
  { eyebrow: "Check your inbox", heading: "Verify your email.", copy: "For review, any six digits work. No message will be sent.", fields: ["6-digit verification code"], action: "Verify email" },
  { eyebrow: "Protect your account", heading: "Create a password.", copy: "Nothing entered here is stored in review mode.", fields: ["Password", "Confirm password"], action: "Save password" },
  { eyebrow: "Stay connected", heading: "Add your phone number.", copy: "This screen is visual only and will not contact your phone.", fields: ["Country", "Phone number"], action: "Continue" },
  { eyebrow: "One more check", heading: "Verify your phone.", copy: "Use any six digits to continue through the review flow.", fields: ["6-digit SMS code"], action: "Verify phone" },
  { eyebrow: "Your invitation", heading: "Enter a Kinship Code.", copy: "A sample code is prefilled so you can finish without an invitation.", fields: ["Kinship Code"], action: "Enter Kiduna" },
];

function ReviewBar({ page }: { page: ReviewPage }) {
  const index = reviewPages.findIndex((item) => item.slug === page.slug);
  const previous = reviewPages[index - 1];
  const next = reviewPages[index + 1];
  return (
    <nav className={styles.reviewBar}>
      <Link href="/review" className={styles.reviewHome}><img src="/kiduna-mark.svg" alt="" /><span>All screens</span></Link>
      <div><small>{page.group}</small><strong>{page.title}</strong></div>
      <div className={styles.pager}>
        {previous ? <Link href={`/review/${previous.slug}`} aria-label="Previous screen">←</Link> : <span>←</span>}
        <b>{index + 1} / {reviewPages.length}</b>
        {next ? <Link href={`/review/${next.slug}`} aria-label="Next screen">→</Link> : <span>→</span>}
      </div>
    </nav>
  );
}

function OnboardingScreen({ page }: { page: ReviewPage }) {
  const step = Number(page.slug.split("/").at(-1));
  const content = onboardingCopy[step - 1];
  const [values, setValues] = useState<Record<string, string>>({ "Kinship Code": "KINSHIP-REVIEW" });
  return (
    <div className={styles.onboardingShell}>
      <header className={styles.simpleHeader}><img src="/kiduna-mark.svg" alt="Kiduna" /><span>Kiduna</span><button type="button">Exit review</button></header>
      <main className={styles.onboardingMain}>
        <aside>
          <p>YOUR PATH INTO KIDUNA</p>
          <h2>Begin with a<br /><i>trusted connection.</i></h2>
          <ol>{onboardingCopy.map((item, index) => <li className={index + 1 === step ? styles.currentStep : index + 1 < step ? styles.completeStep : ""} key={item.heading}><span>{index + 1 < step ? "✓" : index + 1}</span>{item.eyebrow}</li>)}</ol>
        </aside>
        <section className={styles.onboardingCard}>
          <small>STEP {step} OF 6 · {content.eyebrow.toUpperCase()}</small>
          <h1>{content.heading}</h1>
          <p>{content.copy}</p>
          <form onSubmit={(event) => event.preventDefault()}>
            {content.fields.map((field) => <label key={field}><span>{field}</span><input value={values[field] || ""} placeholder={field.includes("code") || field.includes("Code") ? "000000" : `Enter ${field.toLowerCase()}`} onChange={(event) => setValues({ ...values, [field]: event.target.value })} /></label>)}
            {step === 1 && <label className={styles.checkRow}><input type="checkbox" defaultChecked /><span>I agree to receive communications about Kiduna.</span></label>}
            <div className={styles.formActions}>
              {step > 1 && <Link href={`/review/onboarding/${step - 1}`}>Back</Link>}
              <Link className={styles.primaryAction} href={step < 6 ? `/review/onboarding/${step + 1}` : "/review"}>{content.action} <span>→</span></Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

const groupNav: Record<string, string[]> = {
  Studio: ["Dashboard", "Agents", "Knowledge", "Scenes", "Quests", "Markets", "Settings"],
  Active: ["Chat", "Seek", "Vote", "Earn", "Vibe", "Directory"],
  Market: ["Overview", "Objectives", "Proposals", "Electors", "Runs", "Treasury"],
};

function AppScreen({ page }: { page: ReviewPage }) {
  const nav = groupNav[page.group] || groupNav.Studio;
  const isCreate = /create|new|upload|edit|settings/.test(page.slug);
  const isDetail = /sample|detail/.test(page.slug);
  return (
    <div className={styles.appShell}>
      <header className={styles.appHeader}><div><img src="/kiduna-mark.svg" alt="" /><b>KIDUNA</b><span>{page.group.toUpperCase()}</span></div><div className={styles.headerTools}><button>⌕</button><button>?</button><span className={styles.avatar}>DR</span></div></header>
      <div className={styles.appBody}>
        <aside className={styles.appSidebar}><p>WORKSPACE</p>{nav.map((item, index) => <button className={page.title.includes(item.replace(/s$/, "")) || index === 0 ? styles.activeNav : ""} key={item}><span>{["◇", "◎", "◫", "✦", "⬡", "◉", "⚙"][index]}</span>{item}</button>)}<div className={styles.sidebarFoot}><span>WV</span><div><b>West Virginia Duna</b><small>Prototype workspace</small></div></div></aside>
        <main className={styles.appContent}>
          <div className={styles.breadcrumbs}>{page.group} <span>/</span> {page.slug.split("/").slice(1, -1).join(" / ") || "Overview"}</div>
          <div className={styles.pageHeading}><div><small>{isCreate ? "WORKFLOW" : isDetail ? "RECORD" : "WORKSPACE"}</small><h1>{page.title}</h1><p>Review this screen with representative content. Actions are safe and stay inside the visual prototype.</p></div><button className={styles.goldButton}>{isCreate ? "Save draft" : isDetail ? "Edit" : `New ${page.title.replace(/s$/, "")}`}</button></div>
          {isCreate ? <FormCanvas page={page} /> : isDetail ? <DetailCanvas page={page} /> : <CollectionCanvas page={page} />}
        </main>
      </div>
    </div>
  );
}

function FormCanvas({ page }: { page: ReviewPage }) {
  return <div className={styles.formCanvas}><div className={styles.stepRail}><b>01</b><span></span><b>02</b><span></span><b>03</b></div><section><h2>{page.title}</h2><p>Set the essential information for this record.</p><div className={styles.twoFields}><label><span>Name</span><input placeholder={`Name this ${page.title.toLowerCase()}`} /></label><label><span>Visibility</span><select defaultValue="Workspace"><option>Workspace</option><option>Public</option><option>Private</option></select></label></div><label><span>Description</span><textarea placeholder="Describe its purpose, context, and intended outcome…" /></label><div className={styles.dropzone}>＋<b>Add supporting material</b><span>Drop files here or browse</span></div><footer><button>Cancel</button><button className={styles.goldButton}>Continue →</button></footer></section></div>;
}

function DetailCanvas({ page }: { page: ReviewPage }) {
  return <div className={styles.detailGrid}><section className={styles.heroPanel}><small>ACTIVE RECORD</small><div className={styles.recordMark}>✦</div><h2>Sample {page.title}</h2><p>A representative record prepared for reviewing the information hierarchy, controls, and supporting details on this screen.</p><div><span>Active</span><span>Public</span><span>Updated today</span></div></section><section className={styles.statPanel}><small>ACTIVITY</small><strong>24</strong><span>related events</span><hr/><small>CONTRIBUTORS</small><div className={styles.faces}><i>DR</i><i>KM</i><i>KI</i><b>+8</b></div></section><section className={styles.timeline}><h3>Recent activity</h3>{["Record created", "Context attached", "Review requested"].map((item, index) => <div key={item}><span>0{index + 1}</span><p><b>{item}</b><small>{index + 1} hour{index ? "s" : ""} ago · Prototype member</small></p></div>)}</section></div>;
}

function CollectionCanvas({ page }: { page: ReviewPage }) {
  return <><div className={styles.metrics}><article><small>TOTAL</small><strong>24</strong><span>Across this workspace</span></article><article><small>ACTIVE</small><strong>18</strong><span>Ready for participation</span></article><article><small>THIS WEEK</small><strong>+6</strong><span>New activity</span></article></div><div className={styles.collection}><div className={styles.collectionTools}><input placeholder={`Search ${page.title.toLowerCase()}…`} /><button>Filter</button><button>Sort</button></div>{["Field mapping", "Kinship onboarding", "Shared governance", "Community memory"].map((item, index) => <Link href="#" onClick={(event) => event.preventDefault()} key={item}><span className={styles.itemIcon}>{["◇", "✦", "◎", "⬡"][index]}</span><div><b>{item}</b><small>Sample {page.title.toLowerCase()} · Updated {index + 1}d ago</small></div><em>{index % 2 ? "DRAFT" : "ACTIVE"}</em><strong>→</strong></Link>)}</div></>;
}

function PublicScreen({ page }: { page: ReviewPage }) {
  const isAuth = /login|signup|checkout|upgrade|delete-account/.test(page.slug);
  if (isAuth) return <PublicForm page={page} />;
  return <div className={styles.publicShell}><header className={styles.publicNav}><div><img src="/kiduna-mark.svg" alt="" /><b>KIDUNA</b></div><nav><span>About</span><span>Dunas</span><span>People</span><span>Showcase</span></nav><button>Enter Kiduna</button></header><main><section className={styles.publicHero}><p>THE AGENTIC INTERNET STARTS HERE</p><h1>{page.title}<br/><i>built through kinship.</i></h1><span>People and AI agents finding each other, building trust, and organizing to act together in the world.</span><div><button>Explore the field →</button><button>Learn how it works</button></div></section><section className={styles.publicStats}><div><b>01</b><span>Human direction</span></div><div><b>02</b><span>Agentic capacity</span></div><div><b>03</b><span>Verifiable trust</span></div></section><section className={styles.publicCards}><p>DISCOVER {page.title.toUpperCase()}</p><h2>A place to belong<br/><i>and build.</i></h2><div>{["Find your people", "Meet your allies", "Form a Duna"].map((item, index) => <article key={item}><span>0{index + 1}</span><h3>{item}</h3><p>Persistent relationships, shared purpose, and the capacity to do real things together.</p></article>)}</div></section></main></div>;
}

function PublicForm({ page }: { page: ReviewPage }) {
  return <div className={styles.authShell}><section><img src="/kiduna-mark.svg" alt=""/><p>KIDUNA</p><h1>Enter a field of<br/><i>shared agency.</i></h1><span>Every relationship begins with a trusted point of connection.</span></section><main><small>REVIEW MODE · NO ACCOUNT REQUIRED</small><h2>{page.title}</h2><p>Explore the complete screen without submitting real information.</p><label><span>Email address</span><input placeholder="you@example.com" /></label><label><span>{page.slug.includes("delete") ? "Reason" : "Password"}</span><input placeholder="Review-only field" /></label><button>Continue →</button><footer>Nothing entered here is sent or saved.</footer></main></div>;
}

export default function ReviewScreen({ page }: { page: ReviewPage }) {
  return <div className={styles.screenPage}><ReviewBar page={page} /><div className={styles.screenFrame}>{page.group === "Onboarding" ? <OnboardingScreen page={page} /> : page.group === "Public" ? <PublicScreen page={page} /> : <AppScreen page={page} />}</div></div>;
}
