"use client";

// Chintan Desk. One job per screen:
//   sign in → compose (link or headline + category/type/heat)
//           → existing coverage? boost it or research anyway
//           → draft (researching… → edit → publish)
//           → live item (status, extend/end, absorbed articles, unpublish)
// All data goes through /admin/api/* (server-side proxy). The session lives
// in an HttpOnly cookie; this code only ever holds the CSRF token.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// ── types ───────────────────────────────────────────────────────────────────
type Heat = 1 | 2 | 3 | 4;
type NewsType = "normal" | "developing";
type Citation = { url: string; title: string };
type Draft = {
  draft_id: string; topic: string; category: string; news_type: NewsType; heat: Heat;
  status: "researching" | "ready" | "failed" | "publishing" | "published" | "discarded";
  fail_reason: string | null; fail_message: string | null; note: string | null;
  headline: string; summary: string; points: string[]; keywords: string[];
  citations: Citation[]; domain_count: number; image_url: string; source_url: string | null;
  single_source_reason: string; long_running: boolean; attribution: string | null;
  published_ref: { type: string; id: string; article_id?: string } | null;
  created_at: string; updated_at: string; errors: string[];
};
type Match = { type: "article" | "story"; id: string; title: string; score: number; detail: string };
type Story = { id: string; active: boolean; ended_reason: string | null; updates: number; updates_24h: number; closes_at: string | null; long_running: boolean };
type LiveItem = {
  type: "article"; id: string; title: string; category: string; heat: Heat; published_at: string;
  hidden: boolean; single_source: boolean; pinned: boolean;
  absorbed: { article_id: string; title: string; source: string }[]; story: Story | null;
};
type Items = { drafts: Draft[]; published: LiveItem[] };
type View = { name: "home" } | { name: "draft"; id: string } | { name: "item"; id: string };

const CATEGORIES = ["Politics", "Business", "Technology", "Sports", "Entertainment", "Science", "World"];
const HEATS: { v: Heat; label: string; means: string }[] = [
  { v: 1, label: "Normal", means: "Placed like any story from the same time." },
  { v: 2, label: "Notable", means: "Lifted a few places, fading over 12 hours." },
  { v: 3, label: "Big", means: "Near the top for a day. Leads the Developing strip." },
  { v: 4, label: "Breaking", means: "First story for everyone for 6 hours, then Big." },
];
const HEAT_LABEL: Record<number, string> = { 1: "Normal", 2: "Notable", 3: "Big", 4: "Breaking" };
const ENDED: Record<string, string> = { quiet: "went quiet", cap: "reached 14 days", manual: "ended by you", unpublished: "unpublished" };

// ── api ─────────────────────────────────────────────────────────────────────
class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function useApi(csrf: string, onSignedOut: () => void) {
  return useCallback(async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
    let res: Response;
    try {
      res = await fetch(`/admin/api/${path}`, {
        method,
        headers: { "content-type": "application/json", ...(csrf ? { "x-desk-csrf": csrf } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "same-origin",
        cache: "no-store",
      });
    } catch {
      throw new HttpError(0, "You're offline or the connection dropped. Try again.");
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      onSignedOut();
      throw new HttpError(401, "Signed out.");
    }
    if (!res.ok) throw new HttpError(res.status, (data && data.detail) || "Something went wrong. Try again.");
    return data as T;
  }, [csrf, onSignedOut]);
}

// ── small helpers ───────────────────────────────────────────────────────────
function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
function inHours(iso: string): string {
  const h = (new Date(iso).getTime() - Date.now()) / 3600000;
  if (h <= 0.5) return "within the hour";
  if (h < 1.5) return "in ~1h";
  return `in ~${Math.round(h)}h`;
}
function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function outlet(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
const isLink = (t: string) => /^https?:\/\/\S+$/i.test(t.trim());

function useAutosize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return ref;
}

const SAVED_KEY = (id: string) => `desk:unsaved:${id}`;
function stash(id: string, patch: Partial<Draft>) {
  try { sessionStorage.setItem(SAVED_KEY(id), JSON.stringify(patch)); } catch { /* private mode */ }
}
function unstash(id: string): Partial<Draft> | null {
  try {
    const raw = sessionStorage.getItem(SAVED_KEY(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function clearStash(id: string) {
  try { sessionStorage.removeItem(SAVED_KEY(id)); } catch { /* */ }
}

// ── visual atoms ────────────────────────────────────────────────────────────
function Surya({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="15" fill="#DC2626" />
      <g stroke="#DC2626" strokeWidth={6} strokeLinecap="round">
        <line x1="50" y1="8" x2="50" y2="22" /><line x1="50" y1="78" x2="50" y2="92" />
        <line x1="8" y1="50" x2="22" y2="50" /><line x1="78" y1="50" x2="92" y2="50" />
        <line x1="19" y1="19" x2="28" y2="28" /><line x1="72" y1="72" x2="81" y2="81" />
        <line x1="81" y1="19" x2="72" y2="28" /><line x1="28" y1="72" x2="19" y2="81" />
      </g>
    </svg>
  );
}
const Chevron = ({ dir = "right" }: { dir?: "right" | "left" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {dir === "right" ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
  </svg>
);
const Cross = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
const Spinner = () => <span className="desk-spin" aria-hidden="true" />;

function HeatBars({ heat }: { heat: number }) {
  return (
    <span className="desk-heat-bars" aria-hidden="true">
      {[1, 2, 3, 4].map((n) => <i key={n} className={n <= heat ? "on" : ""} />)}
    </span>
  );
}

// Radiogroup with roving focus: arrows move, one tab stop.
function Choice<T extends string | number>({
  label, value, options, onChange, variant, describedBy,
}: {
  label: string; value: T; options: { v: T; label: React.ReactNode; data?: string }[];
  onChange: (v: T) => void; variant: "chips" | "seg" | "heat"; describedBy?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, options.findIndex((o) => o.v === value));
  function onKey(e: React.KeyboardEvent) {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (idx + d + options.length) % options.length;
    onChange(options[n].v);
    refs.current[n]?.focus();
  }
  const cls = variant === "chips" ? "desk-chips" : `desk-seg${variant === "heat" ? " desk-seg--heat" : ""}`;
  return (
    <div role="radiogroup" aria-label={label} aria-describedby={describedBy} className={cls} onKeyDown={onKey}>
      {options.map((o, i) => (
        <button
          key={String(o.v)}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role="radio"
          aria-checked={o.v === value}
          tabIndex={o.v === value ? 0 : -1}
          className={variant === "chips" ? "desk-chip" : undefined}
          data-heat={o.data}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StoryControls({
  category, newsType, heat, onCategory, onType, onHeat, idPrefix,
}: {
  category: string; newsType: NewsType; heat: Heat;
  onCategory: (c: string) => void; onType: (t: NewsType) => void; onHeat: (h: Heat) => void; idPrefix: string;
}) {
  const heatMeans = HEATS.find((h) => h.v === heat)?.means;
  return (
    <>
      <div className="desk-field">
        <span className="desk-label" id={`${idPrefix}-cat`}>Category</span>
        <Choice label="Category" variant="chips" value={category} onChange={onCategory}
          options={CATEGORIES.map((c) => ({ v: c, label: c }))} />
      </div>
      <div className="desk-field">
        <span className="desk-label">Kind of story</span>
        <Choice<NewsType> label="Kind of story" variant="seg" value={newsType} onChange={onType}
          options={[{ v: "normal", label: "Normal" }, { v: "developing", label: "Developing" }]}
          describedBy={`${idPrefix}-type-hint`} />
        <p className="desk-hint" id={`${idPrefix}-type-hint`}>
          {newsType === "developing"
            ? "Tracked as it unfolds: follow-up coverage is attached and it closes itself once it goes quiet."
            : "A single story in the feed."}
        </p>
      </div>
      <div className="desk-field">
        <span className="desk-label">How big is it?</span>
        <Choice<Heat> label="How big is it" variant="heat" value={heat} onChange={onHeat}
          describedBy={`${idPrefix}-heat-hint`}
          options={HEATS.map((h) => ({ v: h.v, data: String(h.v), label: <><HeatBars heat={h.v} />{h.label}</> }))} />
        <p className="desk-hint" id={`${idPrefix}-heat-hint`} aria-live="polite">{heatMeans}</p>
      </div>
    </>
  );
}

// ── sign in ─────────────────────────────────────────────────────────────────
function SignIn({ onDone, notice }: { onDone: (s: { email: string; csrf: string; alert_failed: boolean }) => void; notice: string }) {
  const [step, setStep] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (step === "code") codeRef.current?.focus(); }, [step]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (step === "password") {
      if (!email.trim() || !password) { setErr("Enter your email and password."); return; }
      setStep("code");        // both are checked together on the server, never one at a time
      return;
    }
    if (!/^\d{6}$/.test(code)) { setErr("Enter the 6-digit code from your authenticator app."); return; }
    setBusy(true);
    try {
      const res = await fetch("/admin/api/login", {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ email: email.trim(), password, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCode("");
        setErr(data.detail || "Incorrect email, password or code.");
        if (res.status === 401) { setPassword(""); setStep("password"); setTimeout(() => pwRef.current?.focus(), 0); }
        return;
      }
      setPassword(""); setCode("");
      onDone(data);
    } catch {
      setErr("You're offline or the connection dropped. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="desk-signin desk-view">
      <div className="desk-signin__mark"><Surya size={34} /></div>
      <h1>Chintan Desk</h1>
      <p className="lede">{step === "password" ? "Sign in to add stories to the app." : "Open your authenticator app for the code."}</p>
      {notice && <div className="desk-notice" role="status">{notice}</div>}
      <form onSubmit={submit} noValidate>
        {step === "password" ? (
          <>
            <div className="desk-field">
              <label className="desk-label" htmlFor="si-email">Email</label>
              <input id="si-email" className="desk-input" type="email" autoComplete="username" inputMode="email"
                value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <div className="desk-field">
              <label className="desk-label" htmlFor="si-pw">Password</label>
              <input id="si-pw" ref={pwRef} className="desk-input" type="password" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={err ? "si-err" : undefined} />
            </div>
          </>
        ) : (
          <div className="desk-field">
            <label className="desk-label" htmlFor="si-code">6-digit code</label>
            <input id="si-code" ref={codeRef} className="desk-input desk-code" inputMode="numeric" autoComplete="one-time-code"
              pattern="[0-9]*" maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-describedby={err ? "si-err" : undefined} />
          </div>
        )}
        {err && <p className="desk-error" id="si-err" role="alert">{err}</p>}
        <button className="desk-btn desk-btn--primary desk-btn--block" type="submit" disabled={busy}>
          {busy ? <><Spinner /> Signing in</> : step === "password" ? "Continue" : "Sign in"}
        </button>
        {step === "code" && (
          <button className="desk-btn desk-btn--quiet desk-btn--block" type="button" onClick={() => { setStep("password"); setErr(""); }}>
            Use a different account
          </button>
        )}
      </form>
      <p className="desk-signin__foot">Every sign-in is emailed to you.</p>
    </main>
  );
}

// ── composer ────────────────────────────────────────────────────────────────
function Composer({
  api, onDraft, toast,
}: { api: ReturnType<typeof useApi>; onDraft: (id: string) => void; toast: (m: string) => void }) {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("Politics");
  const [newsType, setNewsType] = useState<NewsType>("normal");
  const [heat, setHeat] = useState<Heat>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [boosting, setBoosting] = useState<string | null>(null);
  const ref = useAutosize(topic);

  async function go(force: boolean) {
    setErr("");
    const t = topic.trim();
    if (t.length < 3) { setErr("Paste a news link or type a headline first."); ref.current?.focus(); return; }
    if (isLink(t) && !/^https:\/\//i.test(t)) { setErr("Paste the https:// version of the link."); return; }
    setBusy(true);
    try {
      const out = await api<{ matches: Match[]; draft: Draft | null }>("POST", "drafts",
        { topic: t, category, news_type: newsType, heat, force });
      if (out.draft) {
        setTopic(""); setMatches(null); setHeat(1); setNewsType("normal");
        onDraft(out.draft.draft_id);
      } else {
        setMatches(out.matches);
      }
    } catch (e) {
      if ((e as HttpError).status !== 401) setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function boost(m: Match) {
    setBoosting(m.id);
    try {
      await api("POST", "boost", { type: m.type, id: m.id, heat });
      toast(`Boosted to ${HEAT_LABEL[heat]}. It'll move up in the feed now.`);
      setTopic(""); setMatches(null); setHeat(1);
    } catch (e) {
      if ((e as HttpError).status !== 401) setErr((e as Error).message);
    } finally {
      setBoosting(null);
    }
  }

  return (
    <section className="desk-compose" aria-labelledby="compose-title">
      <h1 id="compose-title">New story</h1>
      <div className="desk-field">
        <label className="desk-label" htmlFor="topic">Link or headline</label>
        <textarea id="topic" ref={ref} rows={2} className="desk-textarea desk-textarea--topic"
          value={topic} onChange={(e) => { setTopic(e.target.value); setMatches(null); }}
          placeholder="https://… or what happened" maxLength={600}
          aria-invalid={!!err} aria-describedby="topic-hint" />
        <p className="desk-hint" id="topic-hint">
          {isLink(topic) ? "The Desk will read this article, then find other coverage of the same story."
            : "Paste a news link, or type what happened. The Desk finds the coverage, image and sources."}
        </p>
      </div>

      <StoryControls idPrefix="new" category={category} newsType={newsType} heat={heat}
        onCategory={setCategory} onType={setNewsType} onHeat={setHeat} />

      {err && <p className="desk-error" role="alert">{err}</p>}

      {matches ? (
        <div className="desk-matches" role="region" aria-label="Existing coverage">
          <div className="desk-matches__head">
            <h2>Chintan may already have this</h2>
            <p className="desk-hint">Boost it rather than adding a second copy, or research it as a new story if it's different.</p>
          </div>
          {matches.map((m) => (
            <div className="desk-match" key={`${m.type}:${m.id}`}>
              <div>
                <p className="desk-match__title">{m.title}</p>
                <p className="desk-match__meta">{m.type === "story" ? "Developing · " : ""}{m.detail}</p>
              </div>
              <button className="desk-btn" type="button" disabled={heat === 1 || boosting !== null} onClick={() => boost(m)}>
                {boosting === m.id ? <><Spinner /> Boosting</> : heat === 1 ? "Pick a heat above Normal to boost" : <>Boost to {HEAT_LABEL[heat]}</>}
              </button>
            </div>
          ))}
          <div className="desk-matches__foot">
            <button className="desk-btn desk-btn--primary" type="button" disabled={busy} onClick={() => go(true)}>
              {busy ? <><Spinner /> Starting</> : "It's a different story, research it"}
            </button>
            <button className="desk-btn desk-btn--quiet" type="button" onClick={() => setMatches(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="desk-compose__go">
          <button className="desk-btn desk-btn--primary desk-btn--block" type="button" disabled={busy} onClick={() => go(false)}>
            {busy ? <><Spinner /> Checking</> : "Research this"}
          </button>
        </div>
      )}
    </section>
  );
}

// ── home ────────────────────────────────────────────────────────────────────
function draftStatus(d: Draft) {
  if (d.status === "researching") return <span className="desk-status"><span className="desk-dot desk-dot--work" />Researching…</span>;
  if (d.status === "ready") return <span className="desk-status"><span className="desk-dot desk-dot--ready" />Ready to review</span>;
  if (d.status === "failed") return <span className="desk-status"><span className="desk-dot desk-dot--fail" />Couldn&apos;t research</span>;
  return <span className="desk-status"><span className="desk-dot" />Publishing…</span>;
}

function liveStatus(it: LiveItem) {
  if (it.hidden) return <span className="desk-status"><span className="desk-dot" />Unpublished</span>;
  if (it.pinned) return <span className="desk-status"><span className="desk-dot desk-dot--live" />Pinned first</span>;
  if (it.story) {
    if (!it.story.active) return <span className="desk-status"><span className="desk-dot" />Ended · {ENDED[it.story.ended_reason || ""] || "closed"}</span>;
    return (
      <span className="desk-status"><span className="desk-dot desk-dot--live" />
        Live · {it.story.closes_at ? `closes ${inHours(it.story.closes_at)} if quiet` : "open"}
      </span>
    );
  }
  return <span className="desk-status"><span className="desk-dot desk-dot--live" />In the feed</span>;
}

function Home({ api, items, reload, open, toast }: {
  api: ReturnType<typeof useApi>; items: Items | null; reload: () => void;
  open: (v: View) => void; toast: (m: string) => void;
}) {
  return (
    <div className="desk-shell desk-view">
      <Composer api={api} onDraft={(id) => { reload(); open({ name: "draft", id }); }} toast={(m) => { toast(m); reload(); }} />

      <section className="desk-section" aria-labelledby="drafts-title">
        <h2 className="desk-section__title" id="drafts-title">
          In progress {items && <span className="count">{items.drafts.length}</span>}
        </h2>
        <ul className="desk-list">
          {!items ? <li className="desk-empty">Loading…</li>
            : items.drafts.length === 0 ? <li className="desk-empty">Nothing in progress. Stories you start appear here while they&apos;re researched and reviewed.</li>
            : items.drafts.map((d) => (
              <li key={d.draft_id}>
                <button className="desk-row" type="button" onClick={() => open({ name: "draft", id: d.draft_id })}>
                  <span>
                    <p className={`desk-row__title${d.headline ? "" : " is-pending"}`}>{d.headline || d.topic}</p>
                    <p className="desk-row__meta">{draftStatus(d)} · {d.category} · {HEAT_LABEL[d.heat]}</p>
                  </span>
                  <span className="desk-row__chev"><Chevron /></span>
                </button>
              </li>
            ))}
        </ul>
      </section>

      <section className="desk-section" aria-labelledby="live-title">
        <h2 className="desk-section__title" id="live-title">
          Published this week {items && <span className="count">{items.published.length}</span>}
        </h2>
        <ul className="desk-list">
          {!items ? <li className="desk-empty">Loading…</li>
            : items.published.length === 0 ? <li className="desk-empty">Nothing published from the Desk this week.</li>
            : items.published.map((it) => (
              <li key={it.id}>
                <button className="desk-row" type="button" onClick={() => open({ name: "item", id: it.id })}>
                  <span>
                    <p className="desk-row__title">{it.title}</p>
                    <p className="desk-row__meta">{liveStatus(it)} · {HEAT_LABEL[it.heat] || "Normal"} · {ago(it.published_at)}</p>
                  </span>
                  <span className="desk-row__chev"><Chevron /></span>
                </button>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

// ── draft ───────────────────────────────────────────────────────────────────
function DraftView({ api, id, back, onPublished, onReplaced, toast }: {
  api: ReturnType<typeof useApi>; id: string; back: () => void;
  onPublished: (itemId: string) => void; onReplaced: (draftId: string) => void; toast: (m: string) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const [saveState, setSaveState] = useState<"" | "saving" | "saved" | "unsaved">("");
  const [busy, setBusy] = useState<"" | "publish" | "discard" | "retry">("");
  const [imgBroken, setImgBroken] = useState(false);
  const [kwInput, setKwInput] = useState("");
  const pending = useRef<Partial<Draft>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headRef = useAutosize(draft?.headline || "");
  const sumRef = useAutosize(draft?.summary || "");
  const reasonRef = useAutosize(draft?.single_source_reason || "");

  const load = useCallback(async () => {
    try {
      const d = await api<Draft>("GET", `drafts/${id}`);
      const saved = unstash(id);        // edits made before an idle sign-out
      if (saved && d.status === "ready") {
        pending.current = saved;
        setDraft({ ...d, ...saved });
        setSaveState("unsaved");
      } else {
        setDraft(d);
      }
      return d;
    } catch (e) {
      if ((e as HttpError).status !== 401) setErr((e as Error).message);
      return null;
    }
  }, [api, id]);

  // Poll while researching; stop as soon as it settles.
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const d = await load();
      if (alive && d && d.status === "researching") t = setTimeout(tick, 2500);
    };
    tick();
    return () => { alive = false; clearTimeout(t); };
  }, [load]);

  useEffect(() => { setImgBroken(false); }, [draft?.image_url]);

  // Edits restored after a sign-out save themselves once the draft is back.
  const restoredOnce = useRef(false);
  useEffect(() => {
    if (restoredOnce.current || !draft || draft.status !== "ready" || !Object.keys(pending.current).length) return;
    restoredOnce.current = true;
    timer.current = setTimeout(() => { flush(); }, 400);
  }, [draft]);  // eslint-disable-line react-hooks/exhaustive-deps

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const patch = pending.current;
    if (!Object.keys(patch).length) return true;
    pending.current = {};
    setSaveState("saving");
    try {
      const d = await api<Draft>("PATCH", `drafts/${id}`, patch);
      setDraft((cur) => (cur ? { ...d, ...pending.current } : d));
      clearStash(id);
      setSaveState(Object.keys(pending.current).length ? "unsaved" : "saved");
      return true;
    } catch (e) {
      pending.current = { ...patch, ...pending.current };
      stash(id, pending.current);
      setSaveState("unsaved");
      if ((e as HttpError).status !== 401) setErr((e as Error).message);
      return false;
    }
  }, [api, id]);

  function edit(patch: Partial<Draft>) {
    setDraft((cur) => (cur ? { ...cur, ...patch } : cur));
    pending.current = { ...pending.current, ...patch };
    stash(id, pending.current);
    setSaveState("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  }

  async function publish() {
    setErr("");
    setBusy("publish");
    try {
      if (!(await flush())) return;
      const out = await api<{ ref: { type: string; id: string; article_id?: string } }>("POST", `drafts/${id}/publish`);
      clearStash(id);
      toast("Published. It's in the app now.");
      onPublished(out.ref.article_id || out.ref.id);
    } catch (e) {
      if ((e as HttpError).status !== 401) setErr((e as Error).message);
      load();
    } finally {
      setBusy("");
    }
  }

  async function discard() {
    setBusy("discard");
    try {
      await api("POST", `drafts/${id}/discard`);
      clearStash(id);
      toast("Draft discarded.");
      back();
    } catch (e) {
      if ((e as HttpError).status !== 401) setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function retry() {
    if (!draft) return;
    setBusy("retry");
    try {
      await api("POST", `drafts/${id}/discard`);
      const out = await api<{ draft: Draft }>("POST", "drafts", {
        topic: draft.topic, category: draft.category, news_type: draft.news_type, heat: draft.heat, force: true,
      });
      onReplaced(out.draft.draft_id);
    } catch (e) {
      if ((e as HttpError).status !== 401) setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  function addKeyword(raw: string) {
    if (!draft) return;
    const parts = raw.split(/[,;\n]/).map((k) => k.trim().toLowerCase()).filter(Boolean);
    const next = [...draft.keywords];
    for (const p of parts) if (!next.includes(p) && next.length < 5) next.push(p.slice(0, 40));
    edit({ keywords: next });
    setKwInput("");
  }

  const bar = (
    <header className="desk-bar">
      <div className="desk-bar__inner">
        <button className="desk-back" type="button" onClick={async () => { await flush(); back(); }}>
          <Chevron dir="left" /> Desk
        </button>
      </div>
    </header>
  );

  if (!draft) {
    return <>{bar}<div className="desk-shell desk-view">{err ? <div className="desk-notice desk-notice--bad" role="alert">{err}</div> : <div className="desk-skel" aria-hidden="true"><i className="img" /><i className="h" /><i /><i className="s" /></div>}</div></>;
  }

  if (draft.status === "researching") {
    return (
      <>{bar}
        <main className="desk-shell desk-draft desk-view" aria-busy="true">
          <p className="desk-kicker">{isLink(draft.topic) ? outlet(draft.topic) : draft.category} · {HEAT_LABEL[draft.heat]}</p>
          <h1 className="desk-page-title">Researching</h1>
          <p className="desk-hint" role="status">
            {isLink(draft.topic) ? "Reading the article, then finding other coverage of the same story." : "Finding coverage of this on the web."}
            {" "}Usually 20–40 seconds. You can leave this page; the draft will be waiting.
          </p>
          <div className="desk-skel" aria-hidden="true"><i className="img" /><i className="h" /><i /><i /><i className="s" /></div>
        </main>
      </>
    );
  }

  if (draft.status === "failed") {
    return (
      <>{bar}
        <main className="desk-shell desk-draft desk-view">
          <p className="desk-kicker">{draft.topic}</p>
          <h1 className="desk-page-title">Couldn&apos;t research this</h1>
          <div className="desk-notice desk-notice--bad" role="alert">{draft.fail_message || "Research failed. Try again."}</div>
          {err && <p className="desk-error" role="alert">{err}</p>}
          <div className="desk-livecard__actions" style={{ marginTop: 20 }}>
            <button className="desk-btn" type="button" disabled={!!busy} onClick={discard}>{busy === "discard" ? <><Spinner /> Discarding</> : "Discard"}</button>
            <button className="desk-btn desk-btn--primary" type="button" disabled={!!busy} onClick={retry}>{busy === "retry" ? <><Spinner /> Starting</> : "Try again"}</button>
          </div>
        </main>
      </>
    );
  }

  const single = draft.domain_count === 1;
  const errors = draft.errors || [];
  const stateText = saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : saveState === "unsaved" ? "Unsaved changes" : "";

  return (
    <>{bar}
      <main className="desk-shell desk-draft desk-view">
        <p className="desk-kicker">Draft · {draft.source_url ? outlet(draft.source_url) : draft.topic}</p>
        {draft.note && <div className="desk-notice desk-notice--warn"><strong>Built from your link only.</strong> {draft.note}</div>}

        <div className="desk-field">
          <figure className="desk-figure">
            {draft.image_url && !imgBroken
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={draft.image_url} alt="" referrerPolicy="no-referrer" onError={() => setImgBroken(true)} />
              : <p className="desk-figure__none">{imgBroken ? "This image link doesn't load. Paste another, or leave it empty for the default news image." : "No image found. The app's default news image will be used unless you add one."}</p>}
          </figure>
          <label className="desk-label" htmlFor="d-img" style={{ marginTop: 12 }}>Image link</label>
          <input id="d-img" className="desk-input" inputMode="url" placeholder="https://…" value={draft.image_url}
            onChange={(e) => edit({ image_url: e.target.value.trim() })} />
        </div>

        <div className="desk-field">
          <label className="desk-label" htmlFor="d-head">Headline</label>
          <textarea id="d-head" ref={headRef} rows={2} className="desk-textarea desk-textarea--headline" maxLength={160}
            value={draft.headline} onChange={(e) => edit({ headline: e.target.value })} />
        </div>

        <div className="desk-field">
          <label className="desk-label" htmlFor="d-sum">Summary</label>
          <textarea id="d-sum" ref={sumRef} rows={4} className="desk-textarea" maxLength={900}
            value={draft.summary} onChange={(e) => edit({ summary: e.target.value })} />
          <p className="desk-hint">Shown as the story&apos;s opening in the app.</p>
        </div>

        <div className="desk-field">
          <span className="desk-label" id="pts-label">Key points</span>
          <div className="desk-points" role="group" aria-labelledby="pts-label">
            {draft.points.map((p, i) => (
              <div className="desk-point" key={i}>
                <input className="desk-input" aria-label={`Key point ${i + 1}`} maxLength={300} value={p}
                  onChange={(e) => edit({ points: draft.points.map((x, j) => (j === i ? e.target.value : x)) })} />
                <button className="desk-icon-btn" type="button" aria-label={`Remove key point ${i + 1}`}
                  onClick={() => edit({ points: draft.points.filter((_, j) => j !== i) })}><Cross /></button>
              </div>
            ))}
            {draft.points.length < 5 && (
              <button className="desk-btn desk-btn--quiet" type="button" style={{ justifySelf: "start" }}
                onClick={() => edit({ points: [...draft.points, ""] })}>+ Add a point</button>
            )}
          </div>
          <p className="desk-hint">Shown under &ldquo;Inside this story&rdquo; in the app.</p>
        </div>

        <StoryControls idPrefix="d" category={draft.category} newsType={draft.news_type} heat={draft.heat}
          onCategory={(c) => edit({ category: c })} onType={(t) => edit({ news_type: t })} onHeat={(h) => edit({ heat: h })} />

        {draft.news_type === "developing" && (
          <div className="desk-field">
            <label className="desk-switch">
              <span>
                <span className="desk-label" style={{ margin: 0 }}>Keep open past 14 days</span>
                <span className="desk-hint" style={{ display: "block", marginTop: 2 }}>For long-running situations. It still closes after going quiet.</span>
              </span>
              <input type="checkbox" checked={draft.long_running} onChange={(e) => edit({ long_running: e.target.checked })} />
            </label>
          </div>
        )}

        <div className="desk-field">
          <label className="desk-label" htmlFor="d-kw">Tracking words</label>
          <div className="desk-tags">
            {draft.keywords.map((k) => (
              <span className="desk-tag" key={k}>{k}
                <button type="button" aria-label={`Remove ${k}`} onClick={() => edit({ keywords: draft.keywords.filter((x) => x !== k) })}><Cross /></button>
              </span>
            ))}
          </div>
          {draft.keywords.length < 5 && (
            <input id="d-kw" className="desk-input" style={{ marginTop: 8 }} placeholder="Add a name, place or event" value={kwInput}
              onChange={(e) => { if (/[,;]$/.test(e.target.value)) addKeyword(e.target.value); else setKwInput(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (kwInput.trim()) addKeyword(kwInput); } }}
              onBlur={() => { if (kwInput.trim()) addKeyword(kwInput); }} />
          )}
          <p className="desk-hint">
            Used to fold in follow-up coverage from the news feed. Specific names, places or events: two must appear in an article for it to count.
            {draft.news_type === "developing" && " A developing story needs at least 3."}
          </p>
        </div>

        <div className="desk-field">
          <span className="desk-label">Sources</span>
          <ul className="desk-sources">
            {draft.citations.map((c) => (
              <li key={c.url}>
                <a href={c.url} target="_blank" rel="noopener noreferrer">
                  <span className="o">{outlet(c.url)}</span>
                  <span className="t">{c.title || c.url}</span>
                </a>
              </li>
            ))}
          </ul>
          {draft.attribution && <p className="desk-attrib">Appears in the app as: {single ? draft.attribution.replace("· via", "· single source:") : draft.attribution}</p>}
        </div>

        {single && (
          <div className="desk-notice desk-notice--warn">
            <strong>Only one outlet reports this so far.</strong> It can still go out, but say why it&apos;s safe. The story will be labelled single source in the app.
            <label className="desk-label" htmlFor="d-reason" style={{ marginTop: 12 }}>Why is it safe to publish?</label>
            <textarea id="d-reason" ref={reasonRef} rows={2} className="desk-textarea" maxLength={500}
              placeholder="e.g. Official PIB release; the ministry's own statement"
              value={draft.single_source_reason} onChange={(e) => edit({ single_source_reason: e.target.value })} />
          </div>
        )}
      </main>

      <div className="desk-actions">
        <div className="desk-actions__inner">
          <p className="desk-actions__state" aria-live="polite">{stateText}</p>
          {(errors.length > 0 || err) && (
            <ul className="desk-actions__errors" role="alert">
              {err && <li>{err}</li>}
              {errors.map((x) => <li key={x}>{x}</li>)}
            </ul>
          )}
          <button className="desk-btn" type="button" disabled={!!busy} onClick={discard}>
            {busy === "discard" ? <Spinner /> : "Discard"}
          </button>
          <button className="desk-btn desk-btn--primary" type="button" disabled={!!busy || saveState === "saving" || errors.length > 0} onClick={publish}>
            {busy === "publish" ? <><Spinner /> Publishing</> : `Publish${draft.heat > 1 ? ` as ${HEAT_LABEL[draft.heat]}` : ""}`}
          </button>
        </div>
      </div>
    </>
  );
}

// ── live item ───────────────────────────────────────────────────────────────
function ItemView({ api, id, items, reload, back, toast }: {
  api: ReturnType<typeof useApi>; id: string; items: Items | null; reload: () => Promise<void>;
  back: () => void; toast: (m: string) => void;
}) {
  const it = items?.published.find((p) => p.id === id);
  const [busy, setBusy] = useState("");
  const [armed, setArmed] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  async function act(key: string, method: string, path: string, done: string) {
    setErr("");
    setBusy(key);
    try {
      await api(method, path);
      await reload();
      toast(done);
    } catch (e) {
      if ((e as HttpError).status !== 401) setErr((e as Error).message);
    } finally {
      setBusy("");
      setArmed(false);
    }
  }

  const bar = (
    <header className="desk-bar"><div className="desk-bar__inner">
      <button className="desk-back" type="button" onClick={back}><Chevron dir="left" /> Desk</button>
    </div></header>
  );
  if (!it) return <>{bar}<div className="desk-shell desk-view"><p className="desk-empty">{items ? "This item is no longer listed." : "Loading…"}</p></div></>;

  const s = it.story;
  return (
    <>{bar}
      <main className="desk-shell desk-draft desk-view">
        <p className="desk-kicker">{it.category} · {HEAT_LABEL[it.heat] || "Normal"} · published {ago(it.published_at)}{it.single_source ? " · single source" : ""}</p>
        <h1 className="desk-page-title">{it.title}</h1>

        {it.pinned && !it.hidden && (
          <div className="desk-livecard">
            <p className="desk-livecard__line"><span className="desk-dot desk-dot--live" />Pinned first for everyone</p>
            <p className="desk-livecard__sub">Until {clock(new Date(new Date(it.published_at).getTime() + 6 * 3600000).toISOString())}, then it stays near the top for a day.</p>
          </div>
        )}

        {s && !it.hidden && (
          <div className="desk-livecard">
            <p className="desk-livecard__line">
              <span className={`desk-dot${s.active ? " desk-dot--live" : ""}`} />
              {s.active ? "Developing · live" : `Ended · ${ENDED[s.ended_reason || ""] || "closed"}`}
            </p>
            <p className="desk-livecard__sub">
              {s.updates} update{s.updates === 1 ? "" : "s"} · {s.updates_24h} in the last day
              {s.active && s.closes_at ? ` · closes ${inHours(s.closes_at)} if quiet` : ""}
              {s.long_running ? " · kept open past 14 days" : ""}
            </p>
            <div className="desk-livecard__actions">
              <button className="desk-btn" type="button" disabled={!!busy} onClick={() => act("extend", "POST", `stories/${s.id}/extend`, s.active ? "Extended by a day." : "Reopened for a day.")}>
                {busy === "extend" ? <Spinner /> : s.active ? "Extend 24h" : "Reopen for 24h"}
              </button>
              {s.active && (
                <button className="desk-btn" type="button" disabled={!!busy} onClick={() => act("end", "POST", `stories/${s.id}/end`, "Ended. It leaves the Developing strip.")}>
                  {busy === "end" ? <Spinner /> : "End now"}
                </button>
              )}
            </div>
          </div>
        )}

        {it.absorbed.length > 0 && (
          <section className="desk-section" aria-labelledby="abs-title">
            <h2 className="desk-section__title" id="abs-title">Folded in from the news feed <span className="count">{it.absorbed.length}</span></h2>
            <p className="desk-hint" style={{ margin: "0 0 10px" }}>Same event, reported later by the news API. Hidden from the feed so readers don&apos;t see it twice.</p>
            <ul className="desk-absorbed">
              {it.absorbed.map((a) => (
                <li key={a.article_id}>
                  <p>{a.title}<small>{a.source}</small></p>
                  <button className="desk-btn desk-btn--quiet" type="button" disabled={!!busy}
                    onClick={() => act(`undo:${a.article_id}`, "POST", `articles/${it.id}/restore/${a.article_id}`, "Back in the feed as its own story.")}>
                    {busy === `undo:${a.article_id}` ? <Spinner /> : "Undo"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {err && <div className="desk-notice desk-notice--bad" role="alert">{err}</div>}

        <section className="desk-section">
          {it.hidden ? (
            <p className="desk-hint">Unpublished. It no longer appears in the app.</p>
          ) : (
            <>
              <button className={`desk-btn desk-btn--danger desk-btn--block${armed ? " is-armed" : ""}`} type="button" disabled={busy === "unpub"}
                onClick={() => (armed ? act("unpub", "POST", `articles/${it.id}/unpublish`, "Unpublished. It's gone from the app.") : setArmed(true))}>
                {busy === "unpub" ? <><Spinner /> Unpublishing</> : armed ? "Tap again to unpublish" : "Unpublish"}
              </button>
              <p className="desk-hint">Removes it from the app for everyone. Anything it folded in goes back into the feed.</p>
            </>
          )}
        </section>
      </main>
    </>
  );
}

// ── app ─────────────────────────────────────────────────────────────────────
function parseHash(): View {
  if (typeof window === "undefined") return { name: "home" };
  const [kind, id] = window.location.hash.replace(/^#/, "").split("/");
  if ((kind === "draft" || kind === "item") && id && /^[A-Za-z0-9_-]{1,120}$/.test(id)) return { name: kind, id };
  return { name: "home" };
}

export default function DeskApp() {
  const [auth, setAuth] = useState<"checking" | "out" | "in" | "off">("checking");
  const [csrf, setCsrf] = useState("");
  const [email, setEmail] = useState("");
  const [alertFailed, setAlertFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<View>({ name: "home" });
  const [items, setItems] = useState<Items | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const signedOut = useCallback(() => {
    setAuth((a) => {
      if (a === "in") setNotice("You've been signed out (30 minutes idle, or signed out elsewhere). Sign in to carry on; unsaved edits are kept.");
      return "out";
    });
    setCsrf("");
  }, []);
  const api = useApi(csrf, signedOut);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    window.setTimeout(() => setToastMsg((cur) => (cur === m ? "" : cur)), 3200);
  }, []);

  // Who am I? (the cookie is HttpOnly, so ask the server)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/admin/api/me", { credentials: "same-origin", cache: "no-store" });
        if (res.status === 503) { setAuth("off"); return; }
        const me = await res.json().catch(() => ({}));
        if (!res.ok || me.signed_in === false) { setAuth("out"); return; }
        setEmail(me.email); setCsrf(me.csrf); setAlertFailed(!!me.alert_failed); setAuth("in");
      } catch {
        setAuth("out");
      }
    })();
    setView(parseHash());
    const onHash = () => setView(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const reload = useCallback(async () => {
    try { setItems(await api<Items>("GET", "items")); } catch { /* 401 handled; others retry next tick */ }
  }, [api]);

  // Keep the list fresh while on the Desk (research finishing, stories closing).
  useEffect(() => {
    if (auth !== "in") return;
    reload();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") reload(); }, 20000);
    return () => window.clearInterval(t);
  }, [auth, reload]);

  function open(v: View) {
    window.location.hash = v.name === "home" ? "" : `${v.name}/${v.id}`;
    setView(v);
    window.scrollTo({ top: 0 });
  }

  async function signOut() {
    await fetch("/admin/api/logout", { method: "POST", credentials: "same-origin", headers: { "x-desk-csrf": csrf } }).catch(() => {});
    setAuth("out"); setCsrf(""); setItems(null); setNotice("Signed out.");
  }

  if (auth === "checking") return <main className="desk-signin" aria-busy="true"><div className="desk-signin__mark"><Surya size={34} /></div></main>;
  if (auth === "off") {
    return (
      <main className="desk-signin desk-view">
        <div className="desk-signin__mark"><Surya size={34} /></div>
        <h1>Chintan Desk</h1>
        <p className="lede">The Desk isn&apos;t switched on for this server yet. Set DESK_PROXY_SECRET on Railway and Vercel, then reload.</p>
      </main>
    );
  }
  if (auth === "out") {
    return <SignIn notice={notice} onDone={(s) => { setEmail(s.email); setCsrf(s.csrf); setAlertFailed(s.alert_failed); setNotice(""); setAuth("in"); }} />;
  }

  return (
    <>
      {view.name === "home" && (
        <header className="desk-bar"><div className="desk-bar__inner">
          <span className="desk-brand"><Surya size={20} />Desk</span>
          <button className="desk-btn desk-btn--quiet" type="button" onClick={signOut} title={email}>Sign out</button>
        </div></header>
      )}
      {alertFailed && view.name === "home" && (
        <div className="desk-shell" style={{ paddingBottom: 0 }}>
          <div className="desk-notice desk-notice--bad" role="alert">
            <strong>Your sign-in alert email couldn&apos;t be sent.</strong> If you didn&apos;t just sign in, run the reset command in scripts/desk_admin.py now. Check the RESEND key on Railway.
          </div>
        </div>
      )}
      {view.name === "home" && <Home api={api} items={items} reload={reload} open={open} toast={toast} />}
      {view.name === "draft" && (
        <DraftView key={view.id} api={api} id={view.id} back={() => { reload(); open({ name: "home" }); }} toast={toast}
          onPublished={(itemId) => { reload().then(() => open({ name: "item", id: itemId })); }}
          onReplaced={(draftId) => { reload(); open({ name: "draft", id: draftId }); }} />
      )}
      {view.name === "item" && <ItemView api={api} id={view.id} items={items} reload={reload} back={() => open({ name: "home" })} toast={toast} />}
      {toastMsg && <div className="desk-toast" role="status">{toastMsg}</div>}
    </>
  );
}
