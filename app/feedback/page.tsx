import type { Metadata } from "next";
import { Suspense } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import FeedbackForm from "./FeedbackForm";

export const metadata: Metadata = {
  title: "Send feedback — Chintan",
  description: "Tell us what you think of Chintan. Every note gets read.",
};

export default function FeedbackPage() {
  return (
    <>
      <Nav />
      <main className="legal-page">
        <span className="eyebrow">Testing</span>
        <h1>Tell us what you think</h1>
        <p className="updated">You&apos;re helping shape Chintan before launch</p>

        <p>
          You&apos;re one of a small group using Chintan before it&apos;s public, and what you say
          here changes what ships. Good, bad, or somewhere in between — all of it is useful, and
          the critical notes are the most useful of all.
        </p>
        <p>
          No account needed, nothing is public, and one honest line beats a polite paragraph.
        </p>

        <Suspense fallback={<p>Loading…</p>}>
          <FeedbackForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
