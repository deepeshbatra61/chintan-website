import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "About — Chintan",
  description: "Who builds Chintan, and how it works.",
};

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="legal-page">
        <span className="eyebrow">Who we are</span>
        <h1>About Chintan</h1>
        <p className="updated">Don&apos;t just consume. Contemplate.</p>

        <p>
          Chintan is a news reading app for people who want to understand a story, not just skim
          its headline. We surface what&apos;s developing, give you a clear-eyed take on why it
          matters, and always point you back to the original reporting.
        </p>

        <h2>What Chintan is — and isn&apos;t</h2>
        <p>
          Chintan is a news aggregator. We don&apos;t employ reporters and we don&apos;t publish
          original journalism. Every story in the app is built from public reporting by real
          publishers — the app credits the publisher on every article and links straight to their
          original piece so you can read it in full at the source.
        </p>

        <h2>Who operates it</h2>
        <p>
          Chintan is built and operated by <strong>Chintan Labs</strong>, based in New Delhi,
          India.
        </p>

        <h2>Get in touch</h2>
        <p>
          Questions, corrections, or a takedown request — see{" "}
          <a className="inline-link" href="/contact">
            Contact
          </a>
          .
        </p>
      </main>
      <Footer />
    </>
  );
}
