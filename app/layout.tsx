import type { Metadata } from "next";
import { Playfair_Display, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chintan.news"),
  title: "Chintan — The news app for people who read to understand",
  description:
    "Chintan replaces the infinite feed with three curated briefs a day, stories that update instead of repeating, and an AI that shows you the argument you weren't making.",
  openGraph: {
    title: "Chintan — The news app for people who read to understand",
    description:
      "Three curated briefs a day. Stories that update, not repeat. An AI that shows you the other side.",
    url: "https://chintan.news",
    siteName: "Chintan",
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
