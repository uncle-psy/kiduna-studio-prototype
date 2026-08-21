import catalogJson from "../public/data/card-catalog.json";
import countsJson from "../public/data/counts.json";

export type AssetRecord = {
  id: string;
  slug: string;
  name: string;
  originalName: string;
  category: string;
  family: string;
  class: string | null;
  court: string | null;
  type: string;
  timing: string[];
  abilities: string[];
  effect: string[];
  digitalCopy: { name: string; type: string; keywords: string[]; effect: string[] };
  printedTextVerbatim: string[];
  rulesNotes: string[];
  gameplayOrDecorative: "gameplay" | "decorative";
  mappingStatus: string;
  mappingConfidence: string;
  copyStatus: string;
  requiresHumanCopyReview: boolean;
  conflicts: string[];
  notes: string[];
  legacy: null | { sourcePath: string; publicPath: string; filename: string; width: number; height: number; fileSize: number; sha256: string };
  final: null | { sourcePath: string; publicPath: string; filename: string; width: number; height: number; fileSize: number; sha256: string };
  originalPdf: string | null;
  originalPdfPage: number | null;
  originalCrop: string | null;
  finalArtwork: string | null;
  thumbnail: string;
  provenance: { legacySource: string | null; finalSource: string | null; structuredSource: string | null };
  inclusionStatus: string;
};

export const catalog = catalogJson as AssetRecord[];
export const counts = countsJson as Record<string, number>;
export const gameplay = catalog.filter((record) => record.gameplayOrDecorative === "gameplay");
export const decorative = catalog.filter((record) => record.gameplayOrDecorative === "decorative");
export const confirmedPairs = catalog.filter((record) => record.mappingStatus === "confirmed-pair");
export const byId = new Map(catalog.map((record) => [record.id, record]));

export const categoryNames: Record<string, string> = {
  "power-card": "Power Cards",
  "power-back": "Power Back",
  "poker-card": "Poker Deck",
  item: "Items",
  token: "Tokens",
  status: "Table States",
  "reference-card": "Reference Cards",
  "class-identity": "Classes",
  "court-identity": "Courts",
  decorative: "Decorative Art",
};

export function displayCategory(category: string) {
  return categoryNames[category] ?? category.replaceAll("-", " ");
}

export function displayFamily(family: string) {
  return family.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

