import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiduna Studio · Interactive Field Prototype",
  description: "A persistent, interactive prototype of the Kiduna Studio Field.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
