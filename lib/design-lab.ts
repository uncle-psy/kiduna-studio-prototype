export type LabSurface = "outside" | "studio" | "live" | "express" | "tv";

export type LabView = {
  id: string;
  label: string;
  href: string;
  source?: string;
};

export const LAB_SURFACES: readonly { id: LabSurface; label: string; description: string; href?: string }[] = [
  { id: "outside", label: "Outside the Field", description: "Web content outside the Kiduna apps", href: "/outside/landing" },
  { id: "studio", label: "Kiduna Studio", description: "Desktop and laptop · macOS, Windows, ChromeOS", href: "/studio/field" },
  { id: "live", label: "Kiduna Live", description: "Mobile app" },
  { id: "express", label: "Kiduna Express", description: "Chrome extension" },
  { id: "tv", label: "Kiduna TV", description: "Large-format CTV · Android TV, Google TV" },
] as const;

export const OUTSIDE_VIEWS: readonly LabView[] = [
  { id: "landing", label: "1. Welcome and sign in", href: "/outside/landing", source: "/journey/landing/index.html" },
  { id: "signup", label: "2. Create a Kinship account", href: "/outside/signup", source: "/journey/signup/index.html?inviter=david-nikzad&code=KD-DAVID-MOTO-7K4Q" },
  { id: "checkout", label: "3. Compute checkout", href: "/outside/checkout", source: "/journey/checkout/index.html" },
  { id: "organization-selection", label: "4. Organization selection", href: "/outside/organization-selection", source: "/journey/organization-selection/index.html" },
  { id: "resources", label: "5. Resources", href: "/outside/resources", source: "/journey/resources/index.html" },
] as const;

export const STUDIO_VIEWS: readonly LabView[] = [
  { id: "field", label: "Studio Field · working prototype", href: "/studio/field" },
  { id: "calm-realm-start", label: "1. Calm Realm start", href: "/studio/calm-realm-start", source: "/inside-studio/gate-1?scene=0&embed=1" },
  { id: "scheduling-instrument", label: "2. Scheduling in conversation", href: "/studio/scheduling-instrument", source: "/inside-studio/gate-1?scene=1&embed=1" },
  { id: "palo-alto-project", label: "3. Palo Alto project with Matt", href: "/studio/palo-alto-project", source: "/inside-studio/gate-1?scene=2&embed=1" },
  { id: "inner-clinic", label: "4. Inner Clinic", href: "/studio/inner-clinic", source: "/inside-studio/gate-2b1?scene=0&embed=1" },
  { id: "nature-of-work", label: "5. The Nature of Work", href: "/studio/nature-of-work", source: "/inside-studio/gate-2b1?scene=1&embed=1" },
  { id: "second-cavalry", label: "6. 2nd Cavalry oral history", href: "/studio/second-cavalry", source: "/inside-studio/gate-2b1?scene=2&embed=1" },
] as const;

export const LAB_PERSONAS = [
  { id: "david", label: "David Nikzad" },
  { id: "matt", label: "Matt Simon" },
] as const;

export function viewsFor(surface: LabSurface) {
  if (surface === "outside") return OUTSIDE_VIEWS;
  if (surface === "studio") return STUDIO_VIEWS;
  return [];
}
