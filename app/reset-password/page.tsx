import type { Metadata } from "next";
import { Suspense } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password — Chintan",
  description: "Set a new password for your Chintan account.",
};

export default function ResetPasswordPage() {
  return (
    <>
      <Nav />
      <main className="legal-page">
        <span className="eyebrow">Account</span>
        <h1>Set a new password</h1>
        <p className="updated">Requested from the Chintan app</p>

        <p>
          This link works once and expires 30 minutes after it was requested. Once your password
          is updated, you&apos;ll be signed out everywhere — open the app and sign back in with
          your new password.
        </p>

        <Suspense fallback={<p>Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
