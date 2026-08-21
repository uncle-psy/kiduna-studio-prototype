import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kiduna.design"),
  title: { default: "Royals & Rogues Game Library", template: "%s · Royals & Rogues" },
  description: "Original rules, final quiet-enamel art, digital card copy, and developer handoff for Royals & Rogues.",
  openGraph: { title: "Royals & Rogues Game Library", description: "Original rules, final quiet-enamel art, digital card copy, and developer handoff.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
