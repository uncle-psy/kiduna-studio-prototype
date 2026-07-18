import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiduna Studio v0 · Service Alliance Formation",
  description: "An isolated, deterministic design lab for the Kiduna Studio Field.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
