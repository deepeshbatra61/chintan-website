import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — Chintan",
  description: "How Chintan collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="legal-page">
        <span className="eyebrow">Legal</span>
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated: 19 July 2026</p>

        <p>
          This policy explains what information Chintan (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
          collects when you use the Chintan app or chintan.news, why we collect it, and the
          choices you have. Chintan is built to help you understand the news, not to profile you
          for advertising — we collect the minimum needed to run the product.
        </p>

        <h2>1. Information we collect</h2>
        <ul>
          <li>
            <strong>Account information:</strong> your email address and authentication
            credentials when you create an account or sign in.
          </li>
          <li>
            <strong>Content you create:</strong> articles you bookmark or save, comments you post,
            votes you cast in polls, and follow-up questions you ask Ask Chintan.
          </li>
          <li>
            <strong>Preferences:</strong> the topics and interests you select, used to personalize
            your briefs and feed.
          </li>
          <li>
            <strong>Usage and device data:</strong> basic technical information (app version,
            device type, crash logs) used to keep the app working and to fix bugs.
          </li>
        </ul>

        <h2>2. How we use this information</h2>
        <ul>
          <li>To authenticate you and keep your account secure.</li>
          <li>To show you the briefs, stories, and interests you&apos;ve chosen.</li>
          <li>To sync your bookmarks, comments, and poll history across devices.</li>
          <li>To power Ask Chintan&apos;s in-context answers to your questions.</li>
          <li>To diagnose and fix bugs, and to understand aggregate (non-identifying) usage.</li>
        </ul>
        <p>We do not sell your personal data, and we do not use it to serve third-party ads.</p>

        <h2>3. Third-party services</h2>
        <p>
          We use third-party infrastructure providers (for example, cloud hosting and AI model
          providers) to operate Chintan. These providers process data only as necessary to
          deliver the service to you, under their own security and confidentiality obligations to
          us.
        </p>

        <h2>4. Data retention</h2>
        <p>
          We retain your account data for as long as your account is active. If you delete your
          account, we delete your personal data within a reasonable period, except where we are
          required to retain limited records by law. See{" "}
          <a className="inline-link" href="/data-safety">
            Data &amp; Account Deletion
          </a>{" "}
          for how to request this.
        </p>

        <h2>5. Your rights</h2>
        <p>
          You can access, correct, export, or delete your data at any time from within the app, or
          by contacting us (see{" "}
          <a className="inline-link" href="/contact">
            Contact
          </a>
          ).
        </p>

        <h2>6. Children</h2>
        <p>Chintan is not directed at children under 13, and we do not knowingly collect data from them.</p>

        <h2>7. Changes to this policy</h2>
        <p>
          We&apos;ll update this page if our practices change, and update the &ldquo;last
          updated&rdquo; date above.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions about this policy? Reach us via the{" "}
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
