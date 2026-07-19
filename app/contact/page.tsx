import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Contact — Chintan",
  description: "Get in touch with the Chintan team.",
};

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main className="legal-page">
        <span className="eyebrow">Get in touch</span>
        <h1>Contact</h1>
        <p className="updated">We read everything ourselves</p>

        <p>
          Questions, bug reports, data requests, or feedback on where the app falls short — all of
          it goes to the same place.
        </p>

        <h2>Email</h2>
        <p>
          <a className="inline-link" href="mailto:hello@chintan.news">
            hello@chintan.news
          </a>
        </p>

        <h2>Account &amp; data requests</h2>
        <p>
          For account deletion or data requests, see{" "}
          <a className="inline-link" href="/data-safety">
            Data &amp; Account Deletion
          </a>{" "}
          — or email us directly from the address on your account.
        </p>
      </main>
      <Footer />
    </>
  );
}
