"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const API = "https://chintangithubio-production.up.railway.app/api";

type Status = "idle" | "submitting" | "done" | "error";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!token) {
    return (
      <div className="delete-form">
        <p className="delete-form__status delete-form__status--error">
          This link is missing its reset code. Request a new one from the app&apos;s sign-in
          screen (&quot;Forgot password?&quot;).
        </p>
      </div>
    );
  }

  async function submit() {
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Couldn't reset your password");
      }
      setStatus("done");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters");
      setStatus("error");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords don't match");
      setStatus("error");
      return;
    }
    submit();
  }

  if (status === "done") {
    return (
      <div className="delete-form delete-form--done">
        <p>
          <strong>Done.</strong> Your password has been updated, and you&apos;ve been signed out
          everywhere for safety. Open the Chintan app and sign in with your new password.
        </p>
      </div>
    );
  }

  return (
    <div className="delete-form">
      <form onSubmit={handleSubmit}>
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setStatus("idle"); }}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
        <label htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setStatus("idle"); }}
          placeholder="Type it again"
          autoComplete="new-password"
        />

        <button type="submit" className="delete-form__submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Updating…" : "Update password"}
        </button>

        {status === "error" && <p className="delete-form__status delete-form__status--error">{errorMsg}</p>}
      </form>
    </div>
  );
}
