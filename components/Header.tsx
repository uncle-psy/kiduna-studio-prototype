export function Header() {
  return (
    <>
      <nav className="system-strip" aria-label="Kiduna systems">
        <span className="system-strip-label">Kiduna systems</span>
        <a className="system-chip active" href="/" aria-current="page">Royals &amp; Rogues</a>
        <a className="system-chip" href="/systems-oracle">Systems Oracle <span aria-hidden="true">✦</span></a>
      </nav>
      <header className="site-header">
        <a className="wordmark" href="/">ROYALS <span>&amp;</span> ROGUES</a>
        <nav className="navlinks" aria-label="Primary navigation">
          <a href="/flow">How to play</a>
          <a href="/rules">Rules</a>
          <a href="/cards">Library</a>
          <a href="/compare">Old → new</a>
          <a href="/decorative">World art</a>
          <a href="/downloads">Kits</a>
        </nav>
      </header>
    </>
  );
}
