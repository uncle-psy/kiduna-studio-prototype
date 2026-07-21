import { LAB_SURFACES } from "@/lib/design-lab";
import Link from "next/link";
import styles from "./landing.module.css";

export default function KidunaDesignHome() {
  return <main className={styles.home}>
    <div className={styles.field} aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <header className={styles.header}><span className={styles.mark}><i /></span><b>KIDUNA</b><small>DESIGN</small></header>
    <section className={styles.intro}>
      <small>THE KIDUNA DESIGN LAB</small>
      <h1>Designing the world<br />we want to enter.</h1>
      <p>This site holds conceptual prototypes for Kiduna. They are design studies—not the working or functional system—and exist so the experience can be explored, discussed, and refined.</p>
    </section>
    <nav className={styles.surfaces} aria-label="Kiduna Surfaces">
      {LAB_SURFACES.map((surface, index) => {
        const content = <><span>0{index + 1}</span><div><h2>{surface.label}</h2><p>{surface.description}</p></div><b>{surface.href ? "ENTER →" : "PLACEHOLDER"}</b></>;
        return surface.href ? <Link key={surface.id} href={surface.href}>{content}</Link> : <div className={styles.placeholder} key={surface.id}>{content}</div>;
      })}
    </nav>
    <footer>CONCEPTUAL PROTOTYPES · NOT A PRODUCTION SYSTEM</footer>
  </main>;
}
