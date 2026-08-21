import { Header } from "./Header";

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <div className="page-hero">
      <Header />
      <div className="page-hero-copy shell">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
    </div>
  );
}

