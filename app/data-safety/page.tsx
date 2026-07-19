import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Data Safety & Account Deletion — Chintan",
  description: "What Chintan collects, and how to delete your account and data.",
};

export default function DataSafetyPage() {
  return (
    <>
      <Nav />
      <main className="legal-page">
        <span className="eyebrow">Legal</span>
        <h1>Data Safety &amp; Account Deletion</h1>
        <p className="updated">Last updated: 19 July 2026</p>

        <p>
          This page is a plain-language summary of what Chintan collects and how to delete your
          account and data — separate from the full{" "}
          <a className="inline-link" href="/privacy">
            Privacy Policy
          </a>
          , and reachable without signing in, in line with Play Store&apos;s data safety
          requirements.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Email address</strong> — used for account login and sign-in only.</li>
          <li><strong>Saved articles / bookmarks</strong> — so you can find them again across sessions and devices.</li>
          <li><strong>Comments</strong> — the text you post on story discussions.</li>
          <li><strong>Poll votes</strong> — which option you selected on story polls.</li>
          <li><strong>Interests</strong> — the topics you choose, used to personalize your feed and briefs.</li>
          <li><strong>Basic device/crash data</strong> — to keep the app stable.</li>
        </ul>
        <p>We do not collect precise location, contacts, or financial information, and we do not share your data with advertisers.</p>

        <h2>How to delete your account and data</h2>
        <p>You can request full deletion of your account and all associated data in either of these ways:</p>
        <ul>
          <li>
            <strong>In-app:</strong> Settings → Account → Delete Account. This immediately begins
            deletion of your account, bookmarks, comments, poll history, and interests.
          </li>
          <li>
            <strong>By email:</strong> if you don&apos;t have access to the app, email us via the{" "}
            <a className="inline-link" href="/contact">
              Contact
            </a>{" "}
            page from the address associated with your account, and we&apos;ll process the
            deletion request.
          </li>
        </ul>
        <p>
          Deletion is typically completed within 30 days. Some minimal records may be retained
          longer only where required by law (for example, financial or fraud-prevention records),
          and never used for any other purpose.
        </p>

        <h2>Partial deletion</h2>
        <p>
          You can also delete individual pieces of data — a single comment, a bookmark, your poll
          history — from within the app, without deleting your whole account.
        </p>
      </main>
      <Footer />
    </>
  );
}
