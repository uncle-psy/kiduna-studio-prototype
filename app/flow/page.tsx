import type { Metadata } from "next";
import { PageHero } from "../../components/PageHero";
import { Footer } from "../../components/Footer";

export const metadata: Metadata = { title: "How the game flows", description: "A clear, step-by-step explanation of a Royals & Rogues hand and match." };

const steps = [
  ["01", "Choose a Class and Court", "Your Class defines your broad style. Your Court adds a second family of Powers, so every combination plays differently."],
  ["02", "Prepare the table", "Each player begins with 100 coins. Add one Joker to the 52-card poker deck, set out Items, Tokens, state markers, and each player’s Power Deck."],
  ["03", "Draw Powers", "Draw three Powers before the first hand and one before each later hand. Powers stay hidden until their timing lets you use them."],
  ["04", "Deal three hole cards", "Every player receives three private poker cards instead of the usual two. The ordinary Hold’em board and hand rankings still matter."],
  ["05", "Resolve Setup Powers", "Setup Powers happen before betting. Players commit them face down, reveal them in order, and then discard down to five Powers."],
  ["06", "Bet and change the hand", "Play No-Limit Hold’em using antes. Round Powers change decisions during betting; Counter Powers answer specific events and resolve newest first."],
  ["07", "Resolve Showdown", "Eligible players commit Showdown Powers before revealing their hole cards. Resolve Powers, reveal hands, and award the pot."],
  ["08", "Carry the consequences forward", "Update coins, Tokens, Items, Heating Up, Tilted, and discard piles. These persistent states make the next hand different from the last."],
];

export default function FlowPage() {
  return <main><PageHero eyebrow="START HERE" title="One hand, from deal to consequence." intro="Royals & Rogues begins with familiar poker, then opens specific windows where Powers, Items, Tokens, and table states can change what happens." />
    <section className="flow-list shell">{steps.map(([number, title, copy]) => <article key={number}><strong>{number}</strong><div><h2>{title}</h2><p>{copy}</p></div></article>)}</section>
    <section className="callout shell"><div><p className="eyebrow">THE MATCH</p><h2>Win all the coins.</h2><p>The original tournament structure uses ten-minute ante levels of 1, 3, 5, and 10. If several players remain, four sudden-death hands at a 25 ante decide the winner by stack size.</p></div><a className="button primary" href="/rules">Read every rule</a></section><Footer /></main>;
}
