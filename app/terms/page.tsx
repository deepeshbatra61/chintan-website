import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — Chintan",
  description: "The terms that govern your use of Chintan.",
};

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="legal-page">
        <span className="eyebrow">Legal</span>
        <h1>Terms of Service</h1>
        <p className="updated">Last updated: 19 July 2026</p>

        <p>
          These terms govern your use of the Chintan app and chintan.news (together,
          &ldquo;Chintan&rdquo;). By creating an account or using Chintan, you agree to them.
        </p>

        <h2>1. Your account</h2>
        <p>
          You&apos;re responsible for keeping your login credentials secure and for activity that
          happens under your account. Let us know right away if you suspect unauthorized access.
        </p>

        <h2>2. Acceptable use</h2>
        <ul>
          <li>Don&apos;t use Chintan to post illegal, defamatory, or harassing content in comments or polls.</li>
          <li>Don&apos;t attempt to scrape, reverse-engineer, or disrupt the service.</li>
          <li>Don&apos;t impersonate another person or misrepresent your affiliation.</li>
        </ul>
        <p>We may suspend or terminate accounts that violate these terms.</p>

        <h2>3. Content and AI features</h2>
        <p>
          Chintan summarizes and contextualizes news using AI (including The Other Side and Ask
          Chintan). These features are designed to be accurate and balanced, but AI-generated
          content can occasionally be wrong or incomplete — treat it as a starting point for
          understanding, not a substitute for the underlying reporting.
        </p>
        <p>
          Comments, poll votes, and other content you submit remain yours, but you grant us a
          license to display and store them as part of operating Chintan.
        </p>

        <h2>4. Intellectual property</h2>
        <p>
          The Chintan name, logo, and app design are our property. Underlying news articles remain
          the property of their original publishers; Chintan surfaces and summarizes them under
          fair use / licensing arrangements as applicable.
        </p>

        <h2>5. Disclaimers</h2>
        <p>
          Chintan is provided &ldquo;as is&rdquo;. We work hard to keep it accurate and available,
          but we don&apos;t guarantee uninterrupted service or that every summary or AI response
          will be error-free.
        </p>

        <h2>6. Limitation of liability</h2>
        <p>
          To the extent permitted by law, Chintan is not liable for indirect, incidental, or
          consequential damages arising from your use of the app.
        </p>

        <h2>7. Changes</h2>
        <p>We may update these terms from time to time; continued use after a change means you accept the update.</p>

        <h2>8. Contact</h2>
        <p>
          Questions about these terms? Reach us via the{" "}
          <a className="inline-link" href="/contact">
            Contact
          </a>{" "}
          page.
        </p>
      </main>
      <Footer />
    </>
  );
}
