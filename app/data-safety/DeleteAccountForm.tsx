"use client";

import { useState } from "react";

const API = "https://chintangithubio-production.up.railway.app/api";

type Status = "idle" | "confirming" | "submitting" | "done" | "error";

export default function DeleteAccountForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function submitDeletion() {
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch(`${API}/account/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Incorrect email or password");
      }
      setStatus("done");
      setPassword("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || password.length < 8) return;
    setStatus("confirming");
  }

  if (status === "done") {
    return (
      <div className="delete-form delete-form--done">
        <p>
          <strong>Done.</strong> Your account and all associated data (bookmarks, comments, poll
          history, interests) have been permanently deleted.
        </p>
      </div>
    );
  }

  return (
    <div className="delete-form">
      <form onSubmit={handleSubmit}>
        <label htmlFor="del-email">Account email</label>
        <input
          id="del-email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setStatus("idle");
          }}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <label htmlFor="del-password">Password</label>
        <input
          id="del-password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setStatus("idle");
          }}
          placeholder="Your account password"
          autoComplete="current-password"
        />

        {status !== "confirming" && (
          <button type="submit" className="delete-form__submit">
            Delete my account and data
          </button>
        )}

        {status === "confirming" && (
          <div className="delete-form__confirm">
            <p>
              This permanently deletes your account, bookmarks, comments, poll history, and
              interests. This cannot be undone.
            </p>
            <div className="delete-form__confirm-actions">
              <button type="button" onClick={submitDeletion} className="delete-form__submit delete-form__submit--danger">
                Yes, delete everything
              </button>
              <button type="button" onClick={() => setStatus("idle")} className="delete-form__cancel">
                Cancel
              </button>
            </div>
          </div>
        )}

        {status === "submitting" && <p className="delete-form__status">Deleting…</p>}
        {status === "error" && <p className="delete-form__status delete-form__status--error">{errorMsg}</p>}
      </form>
    </div>
  );
}
