import type { Metadata } from "next";
import DeckShell from "../DeckShell";

export const metadata: Metadata = {
  title: "Mapshifting Nature Deck",
  description: "An 81-card Mapshifting manual spanning nine scales of nature, with a nine-card visual calibration.",
};

const cards = [
  ["001","Photon","001-photon"], ["013","Water Molecule","013-water-molecule"], ["019","Cell Membrane","019-cell-membrane"],
  ["030","Ancient Tree","030-ancient-tree"], ["038","Food Web","038-food-web"], ["046","Watershed","046-watershed"],
  ["059","Volcano","059-volcano"], ["066","Orbit","066-orbit"], ["081","Expanding Universe","081-expanding-universe"],
].map(([number,name,file]) => ({ number, name, src: `/mapshifting/nature/${file}.jpg` }));

export default function NatureDeckPage() {
  return <DeckShell
    deckClass="nature-deck"
    eyebrow="NATURE AS A NESTED SYSTEM"
    status="Calibration v1 · 9 of 81 cards illustrated"
    title="Mapshifting"
    subtitle="Nature Deck"
    lede="Move from photon to watershed to expanding universe. Each card uses a natural structure, force, process, or relationship to reveal what changes when the scale of attention changes."
    heroImage="/mapshifting/nature/046-watershed.jpg"
    heroAlt="Watershed calibration card from the Mapshifting Nature Deck"
    metrics={[["81","manual cards"],["9","scale bands"],["9","visual proofs"]]}
    principles={[["Nested systems","Matter, energy, information, boundaries, exchange, change, and time are read in relationship."],["Science before metaphor","Scientific description and observed behavior remain visibly separate from deck synthesis."],["Shift scale, regain choice","The practice asks what larger system contains the situation and what smaller processes compose it."]]}
    cards={cards}
    galleryTitle="One proof from every scale band."
    galleryNote="These nine cards calibrate composition, enamel, gold metalwork, border geometry, and scientific legibility. The remaining 72 images are not yet represented as finished artwork."
    contactSheet="/mapshifting/nature/contact-sheet.jpg"
    contactAlt="Contact sheet for the nine Mapshifting Nature Deck calibration cards"
    integrityTitle="Observe. Translate. Shift scale. Act."
    integrityCopy="The Nature Deck treats metaphor as a disciplined bridge, not as scientific evidence. A reading names present conditions and possible choices rather than a predetermined future."
    integrityPoints={["Describe the real phenomenon and what it actually does.","Name the transferable pattern without turning it into a scientific claim.","Move outward to the containing system and inward to the composing processes.","Choose a proportionate thought, word, or action that can change the situation."]}
    downloads={[
      {href:"/downloads/Mapshifting-Nature-Deck-Manual.zip",label:"Complete Nature Deck manual",detail:"All 81 card records, nine scale bands, indexes, sources, research notes, and audits."},
      {href:"/downloads/Mapshifting-Nature-Deck-Web-Edition.zip",label:"Visual calibration · web edition",detail:"Nine web-ready proof cards, contact sheet, complete manual, and a note pointing to the preserved archival release."},
    ]}
  />;
}
