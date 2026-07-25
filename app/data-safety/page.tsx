import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import DeleteAccountForm from "./DeleteAccountForm";

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

        <h2>Delete your account and data</h2>
        <p>
          Enter your account email and password below to permanently delete your account,
          bookmarks, comments, poll history, and interests. This works right here — no app or
          sign-in required — and takes effect immediately.
        </p>

        <DeleteAccountForm />

        <p>
          Don&apos;t have your password, or the email above didn&apos;t work? Email us via the{" "}
          <a className="inline-link" href="/contact">
            Contact
          </a>{" "}
          page from the address associated with your account and we&apos;ll process the deletion
          request manually.
        </p>

        <h2>Partial deletion</h2>
        <p>
          You can remove individual bookmarks from within the app (swipe to delete on the Saved
          page) without deleting your whole account.
        </p>
      </main>
      <Footer />
    </>
  );
}
