import type { Metadata } from "next";
import { PageHero } from "../../components/PageHero";
import { Footer } from "../../components/Footer";

export const metadata: Metadata = { title: "Complete rules", description: "Complete accessible Royals & Rogues rules reconstructed from the original rulebook." };

const sections = [
  ["Objective and players", "Royals & Rogues is for two to four players, ages 13 and up, and normally takes 20–45 minutes. Win all coins on the table."],
  ["Poker foundation", "Use ordinary No-Limit Texas Hold’em hand rankings and betting logic except where a Royals & Rogues component explicitly changes them. The game uses antes, gives each player three hole cards, and permits Powers only at defined timing windows."],
  ["Game material", "One 52-card poker deck plus one active Joker; individual Power Decks; Items that may enter the poker deck; persistent Tokens; Heating Up and Tilted markers; coins, dealer marker, references, and table markers."],
  ["Setup", "Shuffle one Joker into the poker deck. Give each player 100 coins. Draw for dealer. Choose Class clockwise from the dealer, then Court in reverse order. Build each Power Deck and keep ordinary and One Shot discards separate."],
  ["Setup Powers", "Play after hole cards are dealt and before betting. Place Powers face down, then reveal and resolve clockwise from the dealer."],
  ["Round Powers", "Play on your turn during a betting round, before checking, betting, or folding. You may chain compatible Round Powers before taking the poker action."],
  ["Showdown Powers", "Play after the final betting round but before hole cards are revealed. Eligible players commit Powers face down and resolve them in betting order."],
  ["Counter Powers", "Play when the printed trigger occurs, including outside your turn. When responses form a chain, resolve the newest response first."],
  ["Items", "Items enter the poker deck through Power effects. Play or discard an Item as directed, then place it in the muck. If an Item appears as a board card, remove it and replace it with the next poker card."],
  ["Tokens", "Tokens are persistent effects. They remain with their owner across hands and respond automatically to their printed events."],
  ["Heating Up", "Heating Up unlocks Fire Powers. The original rulebook usually grants it after winning two hands in a row and removes it after a loss. Specific Powers may change that."],
  ["Tilted", "While Tilted, a player may use only Tilted Powers and Powers with Flex. Winning a hand normally removes Tilted; specific Powers may also change it."],
  ["A complete hand", "Draw Powers; deal three hole cards; resolve Setup Powers; discard down to five Powers; conduct betting with Round and Counter opportunities; resolve Showdown Powers; reveal hands; award the pot; update persistent state."],
  ["Match structure", "The original recommendation is No-Limit with ten-minute levels and antes of 1, 3, 5, and 10. If players remain, play four hands at a 25 ante; the largest stack wins."],
];

export default function RulesPage() { return <main><PageHero eyebrow="AUTHORITATIVE RECONSTRUCTION" title="Complete rules" intro="A readable reconstruction of the original playable game. Later revisions are identified separately instead of being silently folded into these rules." />
  <div className="rules-layout shell"><aside><p className="eyebrow">ON THIS PAGE</p>{sections.map(([title], index) => <a key={title} href={`#rule-${index + 1}`}>{index + 1}. {title}</a>)}<a href="#terms">Defined terms</a><a href="#conflicts">Unresolved revisions</a></aside>
  <article className="rules-copy">{sections.map(([title, copy], index) => <section id={`rule-${index + 1}`} key={title}><p className="eyebrow">RULE {String(index + 1).padStart(2,"0")}</p><h2>{title}</h2><p>{copy}</p></section>)}
  <section id="terms"><p className="eyebrow">REFERENCE</p><h2>Defined terms</h2><dl className="terms"><div><dt>Draw</dt><dd>Take the stated number from your Power Deck.</dd></div><div><dt>Fire</dt><dd>Playable while Heating Up unless the effect says otherwise.</dd></div><div><dt>Flex</dt><dd>May be played while Tilted.</dd></div><div><dt>Hot Streak</dt><dd>An enhanced effect available while Heating Up.</dd></div><div><dt>Mulligan</dt><dd>Replace the indicated card with the next card from the appropriate deck.</dd></div><div><dt>One Shot</dt><dd>After resolving, move the Power to the separate One Shot discard.</dd></div><div><dt>Peek</dt><dd>Privately look at the indicated hidden card.</dd></div><div><dt>Recover</dt><dd>Remove or mitigate Tilted as stated.</dd></div><div><dt>Rummage</dt><dd>Use the Item-linked discard or retrieval action printed on the card.</dd></div></dl></section>
  <section className="conflict-block" id="conflicts"><p className="eyebrow">DO NOT SILENTLY MERGE</p><h2>Later revisions still require a ruling.</h2><p>The original rulebook and Core data describe 40-card Power Decks; a later changelog changes them to 30. The later multiplayer changelog also redesigns Inside Connections and adjusts several card texts. This library keeps those changes visible in the conflict report until a game owner ratifies them.</p><a className="button" href="/downloads/content-conflicts.md">Download conflict report</a></section></article></div><Footer /></main>; }

