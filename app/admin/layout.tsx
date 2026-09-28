import type { Metadata, Viewport } from "next";
import "./desk.css";

export const metadata: Metadata = {
  title: "Chintan Desk",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return <div className="desk">{children}</div>;
}
