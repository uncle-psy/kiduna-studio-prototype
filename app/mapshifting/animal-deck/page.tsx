import type { Metadata } from "next";
import DeckShell from "../DeckShell";
import AnimalManualLibrary from "./AnimalManualLibrary";

export const metadata: Metadata = {
  title: "Mapshifting Animal Deck",
  description: "The Living Mirror: a source-grounded 68-card animal deck manual for agency and self-inquiry.",
};

export default function AnimalDeckPage() {
  return <DeckShell
    deckClass="animal-deck"
    eyebrow="THE LIVING MIRROR"
    status="Complete 68-card manual · Approved visual references"
    title="Mapshifting"
    subtitle="Animal Deck"
    lede="Encounter animals as living beings first and symbolic mirrors second. Each card connects a Gift with a related Wound, then returns interpretation to reflection, relationship, and choice."
    heroImage="/mapshifting/animal/001-gray-wolf.jpg"
    heroAlt="Gray Wolf card from the Mapshifting Animal Deck"
    metrics={[["68","species cards"],["10","manual chapters"],["1","living mirror"]]}
    principles={[["Living being first","Verified biology and behavior come before symbolic use, and popular animal myths are corrected."],["Gift and Wound","Capacity and hurt are read as related expressions of one energy—not as positive and negative animals."],["Cultural care","Specific traditions are attributed; closed teachings and generic claims about Indigenous peoples are excluded."]]}
    cards={[]}
    galleryEyebrow="68 CARDS + COMPLETE MANUAL"
    galleryTitle="Every animal, fully opened."
    galleryNote="Each boxed entry joins its own image with the complete card record and full manual wording. Use the index to move directly to an animal; every entry can be collapsed or reopened in place."
    galleryContent={<AnimalManualLibrary/>}
    integrityTitle="Pattern without prediction."
    integrityCopy="The Animal Deck offers reflective possibilities, not diagnoses, directives, or claims of fate. A participant may accept, reject, or reinterpret what a card suggests."
    integrityPoints={["Start with species, habitat, range, and observed behavior.","Distinguish behavioral inference, historical record, cultural attribution, modern authors, and deck synthesis.","Explore how a Gift can arise from a Wound—and how either can become distorted.","End with a grounded question or practice that restores the participant’s agency."]}
    downloads={[{href:"/downloads/Mapshifting-Animal-Deck-Manual.zip",label:"Complete Animal Deck manual",detail:"Sixty-eight card records, reading method, spreads, indexes, bibliography, source ledger, and audits."}]}
  />;
}
