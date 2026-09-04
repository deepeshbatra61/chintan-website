"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const API = "https://chintangithubio-production.up.railway.app/api";

type Status = "idle" | "submitting" | "done" | "error";

const RATINGS = [1, 2, 3, 4, 5];

export default function FeedbackForm() {
  const searchParams = useSearchParams();
  // Prefilled from the nudge email (?name=Bani) so the page greets the person
  // by name and they don't retype what we already know. Still editable, and
  // entirely optional -- a blank name must never block a submission.
  const [name, setName] = useState(searchParams.get("name") || "");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg("Write a line or two first — anything at all.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch(`${API}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          rating,
          name: name.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Couldn't send that — try again in a moment");
      }
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="delete-form delete-form--done">
        <p>
          <strong>Thank you{name.trim() ? `, ${name.trim()}` : ""}.</strong> That genuinely helps —
          every note gets read, and the useful ones turn into changes before launch.
        </p>
      </div>
    );
  }

  return (
    <div className="delete-form">
      <form onSubmit={handleSubmit}>
        <label htmlFor="fb-name">Your name (optional)</label>
        <input
          id="fb-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="So we know who to thank"
          autoComplete="name"
        />

        <label>How does it feel so far? (optional)</label>
        <div className="rating-row">
          {RATINGS.map((n) => (
            <button
              key={n}
              type="button"
              // Tapping the selected value again clears it -- otherwise an
              // accidental tap is permanent and people just abandon the form.
              onClick={() => setRating(rating === n ? null : n)}
              className={`rating-btn${rating === n ? " rating-btn--on" : ""}`}
              aria-pressed={rating === n}
              aria-label={`${n} out of 5`}
            >
              {n}
            </button>
          ))}
        </div>

        <label htmlFor="fb-message">What did you think?</label>
        <textarea
          id="fb-message"
          value={message}
          onChange={(e) => { setMessage(e.target.value); setStatus("idle"); }}
          placeholder="Anything at all — what you liked, what annoyed you, what confused you, what's missing. Bad news is more useful than good news."
          rows={6}
          maxLength={4000}
        />

        <button type="submit" className="delete-form__submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Send feedback"}
        </button>

        {status === "error" && (
          <p className="delete-form__status delete-form__status--error">{errorMsg}</p>
        )}
      </form>
    </div>
  );
}
