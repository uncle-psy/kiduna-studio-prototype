import type { Metadata } from "next";
import "./globals.css";
import "./mapshifting.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kiduna.design"),
  title: { default: "Kiduna Design", template: "%s · Kiduna Design" },
  description: "Conceptual interface systems and implementation-facing prototypes for Kiduna.",
  openGraph: {
    title: "Kiduna Design",
    description: "Explore ten published Kiduna design systems and five living decks.",
    images: ["/og.png"],
  },
  icons: { icon: "/assets/kiduna/mark.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
