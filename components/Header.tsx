export function Header() {
  return (
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
  );
}
