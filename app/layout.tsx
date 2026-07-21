import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiduna Design · Conceptual Prototypes",
  description: "Conceptual prototypes for designing Kiduna and its Surfaces.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
