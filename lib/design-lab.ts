export type LabSurface = "outside" | "studio" | "live" | "express" | "tv";

export type LabView = {
  id: string;
  label: string;
  href: string;
  source?: string;
};

export const LAB_SURFACES: readonly { id: LabSurface; label: string; description: string; href?: string }[] = [
  { id: "outside", label: "Outside the Field", description: "Web content outside the Kiduna apps", href: "/outside/landing" },
  { id: "studio", label: "Kiduna Studio", description: "Desktop and laptop · macOS, Windows, ChromeOS", href: "/studio/the-field" },
  { id: "live", label: "Kiduna Live", description: "Mobile app", href: "/live/the-field" },
  { id: "express", label: "Kiduna Express", description: "Chrome extension" },
  { id: "tv", label: "Kiduna TV", description: "Large-format CTV · Android TV, Google TV" },
] as const;

export const OUTSIDE_VIEWS: readonly LabView[] = [
  { id: "landing", label: "1. Welcome and sign in", href: "/outside/landing", source: "/journey/landing" },
  { id: "signup", label: "2. Create a Kinship account", href: "/outside/signup", source: "/journey/signup?inviter=david-nikzad&code=KD-DAVID-MOTO-7K4Q" },
  { id: "checkout", label: "3. Compute checkout", href: "/outside/checkout", source: "/journey/checkout" },
  { id: "organization-selection", label: "4. Organization selection", href: "/outside/organization-selection", source: "/journey/organization-selection" },
  { id: "resources", label: "5. Resources", href: "/outside/resources", source: "/journey/resources" },
] as const;

export const STUDIO_VIEWS: readonly LabView[] = [
  { id: "the-field", label: "M0 · The Field", href: "/studio/the-field" },
  { id: "create-course", label: "M1 · Create a course", href: "/studio/create-course" },
  { id: "learn-contribute", label: "M2 · Learn & contribute", href: "/studio/learn-contribute" },
  { id: "catalyst-bench", label: "M3 · Catalyst’s bench", href: "/studio/catalyst-bench" },
  { id: "month-close", label: "M4 · Month Close", href: "/studio/month-close" },
  { id: "scene-portal", label: "M5 · Scene Portal", href: "/studio/scene-portal" },
] as const;

export const LIVE_VIEWS: readonly LabView[] = STUDIO_VIEWS.map((view) => ({
  ...view,
  href: view.href.replace("/studio/", "/live/"),
}));

export const LAB_PERSONAS = [
  { id: "david", label: "David Nikzad" },
  { id: "matt", label: "Matt Simon" },
  { id: "moto", label: "Moto" },
  { id: "aashik", label: "Aashik" },
] as const;

export function viewsFor(surface: LabSurface) {
  if (surface === "outside") return OUTSIDE_VIEWS;
  if (surface === "studio") return STUDIO_VIEWS;
  if (surface === "live") return LIVE_VIEWS;
  return [];
}
