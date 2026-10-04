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
  national: boolean | null; sensitive: boolean | null;
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
type Boosted = { type: "article" | "story"; id: string; title: string; heat: Heat | null; boosted_at: string; visible: boolean };
type Items = { drafts: Draft[]; published: LiveItem[]; boosted?: Boosted[] };
type View = { name: "home" } | { name: "draft"; id: string } | { name: "item"; id: string } | { name: "push" }
  | { name: "newsroom" } | { name: "event"; id: string } | { name: "golden" } | { name: "bureau" };
type EventBrief = {
  event_id: string; title: string; status: string; size: number; outlets_count: number;
  coverage_mix: Record<string, number>; category: string | null; last_member_at: string | null;
  new_last_hour: number; promoted: boolean; hidden: boolean;
};
type Newsroom = {
  mode: "off" | "shadow" | "live"; alarm: boolean; developing_cap: number; developing_open: number;
  building: EventBrief[]; developing: EventBrief[]; settling: EventBrief[];
};
type EventMember = {
  article_id: string; title: string; publisher_name?: string; publisher_group?: string;
  published_at: string; syndicated_of?: string | null; origin?: string; url?: string;
};
type EventDetail = {
  event_id: string; status: string; lead_article_id: string; outlets_count?: number;
  coverage_mix?: Record<string, number>; category_v2?: string; state?: string | null;
  desk?: { promoted?: boolean; hidden?: boolean; blocked_members?: string[] }; members: EventMember[];
};
type PushRow = { sent: number; tapped: number; skipped: number };
type PushPanel = {
  state: { enabled: boolean; env_enabled: boolean; env_reason: string | null; updated_at: string | null; updated_by: string | null };
  rows: Record<"sunrise" | "noon" | "dusk" | "breaking", PushRow>;
  errors: { error: string | null; detail: string | null; sent_at: string; kind: string }[];
  devices: number; readers: number; test_email_set: boolean;
  next_slot: { slot: string; local_time: string; tz: string; readers: number } | null;
};
type Reach = { readers: number; devices: number; held: Record<string, number>; live: boolean };
type BreakingPreview = { title: string; body: string; category: string; national: boolean; already_sent: boolean; reach: Reach };
type BreakingReceipt = { ok: boolean; sent: number; failed: number; held: Record<string, number>; title: string; body: string };

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
      toast(`Boosted to ${HEAT_LABEL[heat]}. You'll find it under "Boosted this week".`);
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
            <p className="desk-hint">{newsType === "developing"
              ? "Start it as a developing story: the coverage below folds into it as updates the moment you publish. Boosting only lifts one existing item and doesn't create a developing story."
              : "Boost it rather than adding a second copy, or research it as a new story if it's different."}</p>
          </div>
          {matches.map((m) => (
            <div className="desk-match" key={`${m.type}:${m.id}`}>
              <div>
                <p className="desk-match__title">{m.title}</p>
                <p className="desk-match__meta">{m.type === "story" ? "Developing · " : ""}{m.detail}</p>
              </div>
              <button className={`desk-btn${newsType === "developing" ? " desk-btn--quiet" : ""}`} type="button" disabled={heat === 1 || boosting !== null} onClick={() => boost(m)}>
                {boosting === m.id ? <><Spinner /> Boosting</> : heat === 1 ? "Pick a heat above Normal to boost" : <>Boost to {HEAT_LABEL[heat]}</>}
              </button>
            </div>
          ))}
          <div className="desk-matches__foot">
            <button className="desk-btn desk-btn--primary" type="button" disabled={busy} onClick={() => go(true)}>
              {busy ? <><Spinner /> Starting</> : newsType === "developing" ? "Start a developing story" : "It's a different story, research it"}
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

      {items?.boosted && items.boosted.length > 0 && (
        <section className="desk-section" aria-labelledby="boost-title">
          <h2 className="desk-section__title" id="boost-title">
            Boosted this week <span className="count">{items.boosted.length}</span>
          </h2>
          <ul className="desk-list">
            {items.boosted.map((b) => (
              <li key={`${b.type}:${b.id}`}>
                <div className="desk-row" style={{ cursor: "default" }}>
                  <span>
                    <p className="desk-row__title">{b.title}</p>
                    <p className="desk-row__meta">
                      {b.type === "story" ? "Developing topic" : "Article"} · {HEAT_LABEL[b.heat || 1]} · boosted {ago(b.boosted_at)}
                      {b.visible ? "" : " · not visible in the app"}
                    </p>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
          <label className="desk-switch">
            <span>
              <span className="desk-label" style={{ margin: 0 }}>Every reader</span>
              <span className="desk-hint" style={{ display: "block", marginTop: 2 }}>If you send this as a Breaking push, it goes to everyone, guests included, not only readers who follow {draft.category}.</span>
            </span>
            <input type="checkbox" checked={!!draft.national} onChange={(e) => edit({ national: e.target.checked })} />
          </label>
          <label className="desk-switch" style={{ marginTop: 8 }}>
            <span>
              <span className="desk-label" style={{ margin: 0 }}>Sensitive story</span>
              <span className="desk-hint" style={{ display: "block", marginTop: 2 }}>Deaths, disasters, violence. Push copy stays plain: no wordplay, no photo.</span>
            </span>
            <input type="checkbox" checked={!!draft.sensitive} onChange={(e) => edit({ sensitive: e.target.checked })} />
          </label>
        </div>

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

        {!it.hidden && <BreakingSend api={api} articleId={it.id} category={it.category} toast={toast} />}

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

// ── push ────────────────────────────────────────────────────────────────────
// Design review DR-8A / DR-16A: Breaking shows exactly what phones will show,
// is editable, recounts at send, and needs SEND typed. Going live needs a
// confirm; turning push off is instant.

const HELD_LABEL: Record<string, string> = {
  quiet: "Held: quiet hours (their time)",
  cap_day: "Held: already had Breaking today",
  cap_week: "Held: two Breaking pushes this week",
  gap: "Held: got a push under 90 minutes ago",
  dup: "Held: already got this story",
  off: "Breaking turned off",
};
const SLOT_LABEL: Record<string, string> = { sunrise: "Sunrise", noon: "High Noon", dusk: "Dusk", breaking: "Breaking" };

function NotifPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="desk-notif" aria-label="How the notification looks on Android">
      <p className="desk-notif__head"><Surya size={12} /> Chintan · now</p>
      <p className="desk-notif__title">{title}</p>
      <p className="desk-notif__body">{body || " "}</p>
    </div>
  );
}

function HeldLines({ held }: { held: Record<string, number> }) {
  const rows = Object.entries(held || {}).filter(([, n]) => n > 0);
  return <>{rows.map(([k, n]) => (
    <p className="desk-kv" key={k}><span>{HELD_LABEL[k] || k}</span><span>{n}</span></p>
  ))}</>;
}

function BreakingSend({ api, articleId, category, toast }: {
  api: ReturnType<typeof useApi>; articleId: string; category: string; toast: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<BreakingPreview | null>(null);
  const [text, setText] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"" | "count" | "send">("");
  const [receipt, setReceipt] = useState<BreakingReceipt | null>(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr(""); setBusy("count");
    try {
      const p = await api<BreakingPreview>("POST", "push/breaking/preview", { article_id: articleId });
      setPreview(p); setText(p.body);
    } catch (e) {
      if ((e as HttpError).status !== 401) setErr((e as Error).message);
    } finally { setBusy(""); }
  }

  async function send() {
    setErr(""); setBusy("send");
    try {
      const r = await api<BreakingReceipt>("POST", "push/breaking/send", { article_id: articleId, text, confirm });
      setReceipt(r);
      toast(`Sent to ${r.sent} reader${r.sent === 1 ? "" : "s"}.`);
    } catch (e) {
      if ((e as HttpError).status !== 401) setErr((e as Error).message);
      setConfirm("");
    } finally { setBusy(""); }
  }

  if (receipt) {
    const held = Object.values(receipt.held || {}).reduce((a, b) => a + b, 0);
    return (
      <section className="desk-section" aria-labelledby="bk-title">
        <h2 className="desk-section__title" id="bk-title">Breaking push</h2>
        <div className="desk-livecard">
          <p className="desk-livecard__line"><span className="desk-dot desk-dot--live" />Sent to {receipt.sent} reader{receipt.sent === 1 ? "" : "s"}</p>
          <p className="desk-livecard__sub">{receipt.failed} failed · {held} held</p>
          <a className="desk-link" href="#push">Open the Push panel</a>
        </div>
      </section>
    );
  }

  if (!open) {
    return (
      <section className="desk-section">
        <button className="desk-btn desk-btn--block" type="button" onClick={() => { setOpen(true); load(); }}>Send as Breaking push…</button>
        <p className="desk-hint">Interrupts phones. Readers get at most one Breaking push a day.</p>
      </section>
    );
  }

  const r = preview?.reach;
  const tooLong = text.length > 110;
  const canSend = !!preview && !!r && r.live && r.readers > 0 && !preview.already_sent && !tooLong
    && text.trim().length > 0 && confirm === "SEND" && !busy;

  return (
    <section className="desk-section desk-breaking" aria-labelledby="bk-title">
      <p className="desk-kicker">Push · Breaking</p>
      <h2 className="desk-page-title" id="bk-title" style={{ fontSize: "var(--fs-lead)" }}>Send this as a Breaking push?</h2>
      {!preview && busy === "count" && <p className="desk-hint" aria-live="polite">Counting readers…</p>}
      {err && <div className="desk-notice desk-notice--bad" role="alert">{err}</div>}
      {preview && r && (
        <>
          <NotifPreview title={preview.title} body={text} />
          {preview.already_sent ? (
            <p className="desk-hint">This story was already sent as Breaking.</p>
          ) : (
            <>
              <label className="desk-label" htmlFor="bk-text" style={{ marginTop: 14 }}>Notification text (plain: no emoji, no exclamation marks)</label>
              <input id="bk-text" className="desk-input" value={text} maxLength={140} onChange={(e) => setText(e.target.value)} aria-describedby="bk-count" />
              <p id="bk-count" className={`desk-count${tooLong ? " is-over" : ""}`}>{text.length} / 110</p>

              <p className="desk-kv"><span>Will reach now</span><span>{r.readers} reader{r.readers === 1 ? "" : "s"} · {r.devices} device{r.devices === 1 ? "" : "s"}</span></p>
              <p className="desk-kv"><span>Audience</span><span>{preview.national ? "Every reader" : `Readers who follow ${category}`}</span></p>
              <HeldLines held={r.held} />

              {!r.live && <div className="desk-notice desk-notice--warn" style={{ marginTop: 12 }}><strong>Push is switched off.</strong> Turn it on in the Push panel first.</div>}
              {r.live && r.readers === 0 && <div className="desk-notice" style={{ marginTop: 12 }}>No one to reach right now.</div>}

              <label className="desk-label" htmlFor="bk-confirm" style={{ marginTop: 14 }}>This can&apos;t be recalled. Type SEND to confirm.</label>
              <input id="bk-confirm" className="desk-input desk-input--mono" value={confirm} autoComplete="off" spellCheck={false}
                onChange={(e) => setConfirm(e.target.value.toUpperCase())} />
              <div className="desk-row-actions">
                <button className="desk-btn" type="button" onClick={() => { setOpen(false); setConfirm(""); }}>Cancel</button>
                <button className="desk-btn desk-btn--primary" type="button" disabled={!canSend} onClick={send}>
                  {busy === "send" ? <><Spinner /> Sending</> : `Send to ${r.readers} reader${r.readers === 1 ? "" : "s"}`}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function PushView({ api, back, toast }: { api: ReturnType<typeof useApi>; back: () => void; toast: (m: string) => void }) {
  const [panel, setPanel] = useState<PushPanel | null>(null);
  const [err, setErr] = useState("");
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState<"" | "on" | "off" | "test">("");
  const [test, setTest] = useState<{ ok: boolean; error?: string; devices?: { platform: string; result: string }[] } | null>(null);

  const load = useCallback(async () => {
    setErr("");
    try { setPanel(await api<PushPanel>("GET", "push")); }
    catch (e) { if ((e as HttpError).status !== 401) setErr((e as Error).message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  async function setEnabled(enabled: boolean) {
    setBusy(enabled ? "on" : "off"); setErr("");
    try {
      await api("POST", "push/enabled", { enabled, confirm: enabled });
      await load();
      toast(enabled ? "Push is on. The next slot will send." : "Push is off. Nothing more will send.");
    } catch (e) { if ((e as HttpError).status !== 401) setErr((e as Error).message); }
    finally { setBusy(""); setArmed(false); }
  }

  async function sendTest() {
    setBusy("test"); setTest(null);
    try { setTest(await api("POST", "push/test")); }
    catch (e) { if ((e as HttpError).status !== 401) setErr((e as Error).message); }
    finally { setBusy(""); }
  }

  const bar = (
    <header className="desk-bar"><div className="desk-bar__inner">
      <button className="desk-back" type="button" onClick={back}><Chevron dir="left" /> Desk</button>
    </div></header>
  );
  if (!panel) {
    return <>{bar}<main className="desk-shell desk-view">
      {err ? <div className="desk-notice desk-notice--bad" role="alert">{err} <button className="desk-btn desk-btn--quiet" type="button" onClick={load}>Try again</button></div>
        : <p className="desk-empty">Loading…</p>}
    </main></>;
  }

  const st = panel.state;
  const on = st.enabled && st.env_enabled;
  const rows = (["sunrise", "noon", "dusk", "breaking"] as const).map((k) => [k, panel.rows[k] || { sent: 0, tapped: 0, skipped: 0 }] as const);
  const nothingYet = rows.every(([, r]) => r.sent + r.skipped === 0);
  const ns = panel.next_slot;

  return (
    <>{bar}
      <main className="desk-shell desk-draft desk-view">
        <p className="desk-kicker">Push</p>
        <div className="desk-titlerow">
          <h1 className="desk-page-title">Push notifications</h1>
          <span className={`desk-pill${on ? " is-on" : ""}`}><span className={`desk-dot${on ? " desk-dot--live" : ""}`} /> {on ? "On" : "Off"}</span>
        </div>
        <p className="desk-hint" style={{ marginTop: 0 }}>{panel.readers} reader{panel.readers === 1 ? "" : "s"} · {panel.devices} device{panel.devices === 1 ? "" : "s"} with notifications on</p>

        {err && <div className="desk-notice desk-notice--bad" role="alert">{err}</div>}
        {panel.errors.length > 0 && (
          <div className="desk-notice desk-notice--bad" role="alert">
            <strong>Last delivery error:</strong> {panel.errors[0].detail || panel.errors[0].error} · {ago(panel.errors[0].sent_at)}
          </div>
        )}

        <section className="desk-section">
          {!st.env_enabled ? (
            <>
              <button className="desk-btn desk-btn--block" type="button" disabled>Turn push on…</button>
              <p className="desk-hint">{st.env_reason || "Forced off by a server setting."}</p>
            </>
          ) : on ? (
            <>
              <button className="desk-btn desk-btn--danger desk-btn--block" type="button" disabled={!!busy} onClick={() => setEnabled(false)}>
                {busy === "off" ? <Spinner /> : "Turn push off"}
              </button>
              <p className="desk-hint">Stops every scheduled and Breaking push from the next minute. Instant, no confirm.</p>
            </>
          ) : armed ? (
            <div className="desk-livecard">
              <p className="desk-livecard__line">Turn push on?</p>
              <p className="desk-livecard__sub">{ns ? `Next slot: ${ns.slot} at ${ns.local_time} (${ns.tz}), ${ns.readers} reader${ns.readers === 1 ? "" : "s"}.` : "No readers have notifications on yet."}</p>
              <div className="desk-livecard__actions">
                <button className="desk-btn" type="button" onClick={() => setArmed(false)}>Cancel</button>
                <button className="desk-btn desk-btn--primary" type="button" disabled={!!busy} onClick={() => setEnabled(true)}>
                  {busy === "on" ? <Spinner /> : "Turn on"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button className="desk-btn desk-btn--primary desk-btn--block" type="button" onClick={() => setArmed(true)}>Turn push on…</button>
              <p className="desk-hint">Turn it on once your test push arrives. Turning it on asks you to confirm.</p>
            </>
          )}
        </section>

        <section className="desk-section" aria-labelledby="test-title">
          <h2 className="desk-section__title" id="test-title">Test push</h2>
          <button className="desk-btn desk-btn--block" type="button" disabled={!!busy || !panel.test_email_set} onClick={sendTest}>
            {busy === "test" ? <><Spinner /> Sending</> : "Send a test push to my devices"}
          </button>
          <p className="desk-hint">{panel.test_email_set ? "Works even while push is off." : "Set PUSH_TEST_USER_EMAIL on Railway to the app account you test with."}</p>
          {test && (test.devices && test.devices.length > 0 ? (
            <ul className="desk-list" style={{ marginTop: 10 }}>
              {test.devices.map((d, i) => (
                <li key={i}><p className="desk-kv"><span>{d.platform === "ios" ? "iPhone" : "Android"}</span><span>{d.result}</span></p></li>
              ))}
            </ul>
          ) : <div className="desk-notice desk-notice--bad" role="alert" style={{ marginTop: 10 }}>{test.error}</div>)}
        </section>

        <section className="desk-section" aria-labelledby="stats-title">
          <h2 className="desk-section__title" id="stats-title">Last 7 days</h2>
          <table className="desk-table">
            <thead><tr><th scope="col">Slot</th><th scope="col">Sent</th><th scope="col">Tapped</th><th scope="col">Skipped</th></tr></thead>
            <tbody>
              {rows.map(([k, r]) => (
                <tr key={k}><th scope="row">{SLOT_LABEL[k]}</th><td>{r.sent || "—"}</td><td>{r.tapped || "—"}</td><td>{k === "breaking" ? "" : r.skipped || "—"}</td></tr>
              ))}
            </tbody>
          </table>
          {nothingYet && <p className="desk-hint">Nothing sent yet.</p>}
        </section>
      </main>
    </>
  );
}

// ── newsroom (News v2 events; design 7B) ────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  forming: "Forming", early_report: "Early report", developing: "Developing", settled: "Settling", closed: "Closed",
};
function mixLine(mix?: Record<string, number>): string {
  if (!mix) return "";
  return (["national", "regional", "wire", "international", "other"] as const)
    .filter((k) => mix[k]).map((k) => `${mix[k]} ${k}`).join(" · ");
}

function NewsroomView({ api, back, open }: {
  api: ReturnType<typeof useApi>; back: () => void; open: (v: View) => void;
}) {
  const [data, setData] = useState<Newsroom | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    try { setData(await api<Newsroom>("GET", "newsroom")); setErr(""); }
    catch (e) { if ((e as HttpError).status !== 401) setErr((e as Error).message); }
  }, [api]);
  useEffect(() => {
    load();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    return () => window.clearInterval(t);
  }, [load]);

  const section = (key: "building" | "developing" | "settling", title: string, empty: string) => (
    <section className="desk-section" aria-labelledby={`nr-${key}`}>
      <h2 className="desk-section__title" id={`nr-${key}`}>
        {title} {data && <span className="count">{key === "developing" ? `${data.developing_open}/${data.developing_cap}` : data[key].length}</span>}
      </h2>
      <ul className="desk-list">
        {!data ? <li className="desk-empty">Loading…</li>
          : data[key].length === 0 ? <li className="desk-empty">{empty}</li>
          : data[key].map((ev) => (
            <li key={ev.event_id}>
              <button className="desk-row" type="button" onClick={() => open({ name: "event", id: ev.event_id })}>
                <span>
                  <p className="desk-row__title">{ev.title}</p>
                  <p className="desk-row__meta">
                    {ev.outlets_count} outlet{ev.outlets_count === 1 ? "" : "s"}
                    {ev.new_last_hour > 0 ? ` · +${ev.new_last_hour} in 1h` : ""}
                    {ev.category ? ` · ${ev.category}` : ""}
                    {ev.last_member_at ? ` · ${ago(ev.last_member_at)}` : ""}
                    {ev.promoted ? " · promoted" : ""}{ev.hidden ? " · hidden" : ""}
                  </p>
                </span>
                <span className="desk-row__chev"><Chevron /></span>
              </button>
            </li>
          ))}
      </ul>
    </section>
  );

  return (
    <>
      <header className="desk-bar"><div className="desk-bar__inner">
        <button className="desk-back" type="button" onClick={back}><Chevron dir="left" /> Desk</button>
      </div></header>
      <main className="desk-shell desk-view">
        <p className="desk-kicker">Newsroom</p>
        <div className="desk-titlerow">
          <h1 className="desk-page-title">What&apos;s forming</h1>
          {data && (
            <span className={`desk-pill${data.mode === "live" ? " is-on" : ""}`}>
              <span className={`desk-dot${data.mode === "live" ? " desk-dot--live" : ""}`} /> {data.mode === "live" ? "Live" : data.mode === "shadow" ? "Shadow" : "Off"}
            </span>
          )}
        </div>
        <p className="desk-hint" style={{ marginTop: 0 }}>
          {data?.mode === "live" ? "Readers see one card per event and this Developing list."
            : "Shadow: events are grouped here for you only. The app hasn’t changed."}
        </p>
        {data?.mode !== "live" && (
          <button className="desk-btn desk-btn--block" type="button" style={{ marginBottom: 12 }} onClick={() => open({ name: "golden" })}>
            Check groupings: same story or not?
          </button>
        )}
        {data?.alarm && (
          <div className="desk-notice desk-notice--bad" role="alert">
            <strong>Developing alarm:</strong> too many stories are marked Developing. The app is showing only the 15 most active.
          </div>
        )}
        {err && <div className="desk-notice desk-notice--bad" role="alert">{err} <button className="desk-btn desk-btn--quiet" type="button" onClick={load}>Try again</button></div>}
        {section("building", "Building now", "Nothing is gathering pace right now.")}
        {section("developing", "Developing", "No developing events. Promote one from Building now if it should be.")}
        {section("settling", "Settling", "Nothing settling.")}
      </main>
    </>
  );
}

function EventView({ api, id, back, open, toast }: {
  api: ReturnType<typeof useApi>; id: string; back: () => void; open: (v: View) => void; toast: (m: string) => void;
}) {
  const [ev, setEv] = useState<EventDetail | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [splitting, setSplitting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [removing, setRemoving] = useState("");
  const [merging, setMerging] = useState(false);
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<EventBrief[]>([]);
  const [mergeInto, setMergeInto] = useState<EventBrief | null>(null);

  const load = useCallback(async () => {
    try { setEv(await api<EventDetail>("GET", `events/${id}`)); setErr(""); }
    catch (e) { if ((e as HttpError).status !== 401) setErr((e as Error).message); }
  }, [api, id]);
  useEffect(() => { load(); }, [load]);

  async function act(label: string, path: string, body: unknown, done: string, after?: (r: { event_id?: string }) => void) {
    setBusy(label); setErr("");
    try {
      const r = await api<{ event_id?: string }>("POST", path, body);
      toast(done);
      if (after) after(r); else await load();
    } catch (e) { if ((e as HttpError).status !== 401) setErr((e as Error).message); }
    finally { setBusy(""); }
  }

  async function startMerge() {
    setMerging(true);
    try {
      const nr = await api<Newsroom>("GET", "newsroom");
      setTargets([...nr.developing, ...nr.building, ...nr.settling].filter((t) => t.event_id !== id));
    } catch (e) { if ((e as HttpError).status !== 401) setErr((e as Error).message); }
  }

  const bar = (
    <header className="desk-bar"><div className="desk-bar__inner">
      <button className="desk-back" type="button" onClick={back}><Chevron dir="left" /> Newsroom</button>
    </div></header>
  );
  if (!ev) {
    return <>{bar}<main className="desk-shell desk-view">
      {err ? <div className="desk-notice desk-notice--bad" role="alert">{err}</div> : <p className="desk-empty">Loading…</p>}
    </main></>;
  }
  const lead = ev.members.find((m) => m.article_id === ev.lead_article_id) || ev.members[0];
  const promoted = !!ev.desk?.promoted;
  const hidden = !!ev.desk?.hidden;
  const q = query.trim().toLowerCase();
  const shown = targets.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 8);

  return (
    <>{bar}
      <main className="desk-shell desk-draft desk-view">
        <p className="desk-kicker">{STATUS_LABEL[ev.status] || ev.status}{ev.category_v2 ? ` · ${ev.category_v2}` : ""}{ev.state ? ` · ${ev.state}` : ""}</p>
        <h1 className="desk-page-title">{lead?.title || "Event"}</h1>
        <p className="desk-hint" style={{ marginTop: 0 }}>
          {ev.outlets_count || 0} outlet{ev.outlets_count === 1 ? "" : "s"}{ev.coverage_mix ? ` · ${mixLine(ev.coverage_mix)}` : ""} · {ev.members.length} article{ev.members.length === 1 ? "" : "s"}
        </p>
        {err && <div className="desk-notice desk-notice--bad" role="alert">{err}</div>}

        <section className="desk-section">
          <div className="desk-row-actions">
            <button className="desk-btn" type="button" disabled={!!busy}
              onClick={() => act("promote", `events/${id}/promote`, { on: !promoted }, promoted ? "No longer forced to Developing." : "Promoted to Developing.")}>
              {busy === "promote" ? <Spinner /> : promoted ? "Unpromote" : "Promote to Developing"}
            </button>
            <button className={`desk-btn${hidden ? "" : " desk-btn--danger"}`} type="button" disabled={!!busy}
              onClick={() => act("hide", `events/${id}/hide`, { on: !hidden }, hidden ? "Shown again." : "Hidden from readers.")}>
              {busy === "hide" ? <Spinner /> : hidden ? "Show again" : "Hide"}
            </button>
            <button className="desk-btn" type="button" disabled={!!busy} onClick={merging ? () => { setMerging(false); setMergeInto(null); } : startMerge}>
              {merging ? "Cancel merge" : "Merge into…"}
            </button>
            <button className="desk-btn" type="button" disabled={!!busy || ev.members.length < 2}
              onClick={() => { setSplitting(!splitting); setPicked([]); }}>
              {splitting ? "Cancel split" : "Split…"}
            </button>
          </div>
          <p className="desk-hint">Promote forces it into Developing. Hide removes it from the app. Your changes stick: the engine won&apos;t undo them.</p>
        </section>

        {merging && (
          <section className="desk-section" aria-labelledby="merge-title">
            <h2 className="desk-section__title" id="merge-title">Merge into another event</h2>
            {mergeInto ? (
              <div className="desk-livecard">
                <p className="desk-livecard__line">Merge into &ldquo;{mergeInto.title}&rdquo;?</p>
                <p className="desk-livecard__sub">All {ev.members.length} articles move there and this event closes. Followers move with it.</p>
                <div className="desk-livecard__actions">
                  <button className="desk-btn" type="button" onClick={() => setMergeInto(null)}>Back</button>
                  <button className="desk-btn desk-btn--primary" type="button" disabled={!!busy}
                    onClick={() => act("merge", `events/${id}/merge`, { into: mergeInto.event_id }, "Merged.",
                      (r) => open({ name: "event", id: r.event_id || mergeInto.event_id }))}>
                    {busy === "merge" ? <Spinner /> : "Merge"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <label className="desk-label" htmlFor="merge-q">Find the event</label>
                <input id="merge-q" className="desk-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Words from its headline" autoComplete="off" />
                <ul className="desk-list" style={{ marginTop: 8 }}>
                  {shown.length === 0 ? <li className="desk-empty">No matching events from the last 36 hours.</li>
                    : shown.map((t) => (
                      <li key={t.event_id}>
                        <button className="desk-row" type="button" onClick={() => setMergeInto(t)}>
                          <span><p className="desk-row__title">{t.title}</p>
                            <p className="desk-row__meta">{STATUS_LABEL[t.status] || t.status} · {t.outlets_count} outlets</p></span>
                          <span className="desk-row__chev"><Chevron /></span>
                        </button>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </section>
        )}

        <section className="desk-section" aria-labelledby="members-title">
          <h2 className="desk-section__title" id="members-title">
            {splitting ? "Tick the articles that are a different story" : "Coverage"} <span className="count">{ev.members.length}</span>
          </h2>
          <ul className="desk-list">
            {ev.members.map((m) => (
              <li key={m.article_id}>
                <div className="desk-row" style={{ cursor: "default" }}>
                  {splitting && (
                    <input type="checkbox" aria-label={`Split off ${m.title}`} checked={picked.includes(m.article_id)}
                      onChange={(e) => setPicked(e.target.checked ? [...picked, m.article_id] : picked.filter((x) => x !== m.article_id))}
                      style={{ width: 20, height: 20, marginRight: 10, flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1 }}>
                    <p className="desk-row__title">{m.title}</p>
                    <p className="desk-row__meta">
                      {m.origin === "desk" ? "Chintan Desk" : m.publisher_name || (m.url ? outlet(m.url) : "")}
                      {m.publisher_group && m.origin !== "desk" ? ` · ${m.publisher_group}` : ""}
                      {m.syndicated_of ? " · wire copy" : ""}{m.article_id === ev.lead_article_id ? " · lead" : ""} · {ago(m.published_at)}
                    </p>
                  </span>
                  {!splitting && m.origin !== "desk" && (removing === m.article_id ? (
                    <span style={{ display: "flex", gap: 4 }}>
                      <button className="desk-btn desk-btn--quiet" type="button" onClick={() => setRemoving("")}>Keep</button>
                      <button className="desk-btn desk-btn--danger" type="button" disabled={!!busy}
                        onClick={() => act("remove", `events/${id}/remove/${m.article_id}`, undefined, "Removed. It won’t be added back.", () => { setRemoving(""); load(); })}>
                        Remove
                      </button>
                    </span>
                  ) : (
                    <button className="desk-btn desk-btn--quiet" type="button" onClick={() => setRemoving(m.article_id)}>Remove…</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {splitting && (
            <button className="desk-btn desk-btn--primary desk-btn--block" type="button" style={{ marginTop: 12 }}
              disabled={!!busy || picked.length === 0 || picked.length === ev.members.length}
              onClick={() => act("split", `events/${id}/split`, { article_ids: picked }, "Split into a new event.",
                (r) => { setSplitting(false); setPicked([]); if (r.event_id) open({ name: "event", id: r.event_id }); })}>
              {busy === "split" ? <Spinner /> : picked.length ? `Break out ${picked.length} as a new event` : "Tick at least one"}
            </button>
          )}
        </section>
      </main>
    </>
  );
}

// ── check groupings (golden set spot-check; eng review 3A / OV5) ─────────────
type GoldenSide = { article_id: string; title: string; description?: string; publisher_name?: string; published_at: string };
type GoldenPair = { pair_id: string; kind: "grouped" | "near_miss"; engine_same: boolean; a: GoldenSide; b: GoldenSide };
type GoldenSummary = { labelled: number; agree: number; merge_precision: number | null; merge_recall: number | null;
  gate: { precision: number; recall: number };
  sweep?: { current: number; pairs: number; rows: { t: number; precision: number | null; recall: number | null }[] } };

function pct(x: number | null): string {
  return x === null ? "—" : `${Math.round(x * 100)}%`;
}

function GoldenView({ api, back }: { api: ReturnType<typeof useApi>; back: () => void }) {
  const [pairs, setPairs] = useState<GoldenPair[] | null>(null);
  const [summary, setSummary] = useState<GoldenSummary | null>(null);
  const [i, setI] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ pairs: GoldenPair[]; summary: GoldenSummary }>("GET", "golden/pairs");
      setPairs(r.pairs); setSummary(r.summary); setI(0); setErr("");
    } catch (e) { if ((e as HttpError).status !== 401) setErr((e as Error).message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  async function answer(same: boolean | null) {
    if (!pairs) return;
    const p = pairs[i];
    if (same !== null) {
      setBusy(true);
      try {
        setSummary(await api<GoldenSummary>("POST", "golden/labels",
          { pair_id: p.pair_id, a: p.a.article_id, b: p.b.article_id, same, engine_same: p.engine_same }));
      } catch (e) { if ((e as HttpError).status !== 401) setErr((e as Error).message); setBusy(false); return; }
      setBusy(false);
    }
    setI(i + 1);
  }

  const side = (s: GoldenSide) => (
    <div className="desk-livecard" style={{ marginBottom: 10 }}>
      <p className="desk-livecard__line" style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}>{s.title}</p>
      {s.description && s.description !== s.title && <p className="desk-livecard__sub">{s.description.slice(0, 220)}</p>}
      <p className="desk-row__meta" style={{ marginTop: 6 }}>{s.publisher_name || "Unknown outlet"} · {ago(s.published_at)}</p>
    </div>
  );

  const passed = summary && summary.merge_precision !== null && summary.merge_recall !== null
    && summary.merge_precision >= summary.gate.precision && summary.merge_recall >= summary.gate.recall;

  return (
    <>
      <header className="desk-bar"><div className="desk-bar__inner">
        <button className="desk-back" type="button" onClick={back}><Chevron dir="left" /> Newsroom</button>
      </div></header>
      <main className="desk-shell desk-draft desk-view">
        <p className="desk-kicker">Check groupings</p>
        <h1 className="desk-page-title">Same story?</h1>
        <p className="desk-hint" style={{ marginTop: 0 }}>
          Your answers decide whether grouping goes live for readers: it needs {summary ? pct(summary.gate.precision) : "95%"} of
          its &ldquo;same story&rdquo; calls right and to catch {summary ? pct(summary.gate.recall) : "80%"} of real matches.
        </p>
        {err && <div className="desk-notice desk-notice--bad" role="alert">{err}</div>}
        {!pairs ? <p className="desk-empty">Loading…</p>
          : i < pairs.length ? (
            <section className="desk-section" aria-live="polite">
              <p className="desk-row__meta" style={{ marginBottom: 10 }}>{i + 1} of {pairs.length}</p>
              {side(pairs[i].a)}
              {side(pairs[i].b)}
              <div className="desk-row-actions" style={{ marginTop: 6 }}>
                <button className="desk-btn desk-btn--primary" type="button" disabled={busy} onClick={() => answer(true)}>Same story</button>
                <button className="desk-btn" type="button" disabled={busy} onClick={() => answer(false)}>Different stories</button>
                <button className="desk-btn desk-btn--quiet" type="button" disabled={busy} onClick={() => answer(null)}>Not sure, skip</button>
              </div>
              <p className="desk-hint">&ldquo;Same story&rdquo; means one event: the same announcement, match or incident, even from different angles.</p>
            </section>
          ) : (
            <section className="desk-section">
              <p className="desk-empty" style={{ textAlign: "left" }}>
                {pairs.length === 0 ? "Nothing new to check right now. Come back after a few more hours of news." : "That's this batch done. Thank you."}
              </p>
              <button className="desk-btn desk-btn--block" type="button" onClick={load}>Load more pairs</button>
            </section>
          )}
        {summary && summary.labelled > 0 && (
          <section className="desk-section" aria-labelledby="golden-score">
            <h2 className="desk-section__title" id="golden-score">Score so far <span className="count">{summary.labelled}</span></h2>
            <table className="desk-table">
              <tbody>
                <tr><th scope="row">Agrees with you</th><td>{summary.agree} of {summary.labelled}</td></tr>
                <tr><th scope="row">&ldquo;Same story&rdquo; calls right</th><td>{pct(summary.merge_precision)} (needs {pct(summary.gate.precision)})</td></tr>
                <tr><th scope="row">Real matches caught</th><td>{pct(summary.merge_recall)} (needs {pct(summary.gate.recall)})</td></tr>
              </tbody>
            </table>
            <p className="desk-hint">{summary.labelled < 40 ? `Check at least 40 pairs before deciding.` : passed ? "Meets the bar." : "Not there yet: the matching needs tuning before it goes live."}</p>
          </section>
        )}
        {summary?.sweep && summary.sweep.pairs > 0 && (
          <section className="desk-section" aria-labelledby="golden-sweep">
            <h2 className="desk-section__title" id="golden-sweep">How strict should matching be?</h2>
            <p className="desk-hint">
              Your {summary.sweep.pairs} answers, replayed at different strictness levels. Lower catches more real
              matches but groups more stories wrongly. Today: {summary.sweep.current.toFixed(2)}. Rows that meet both
              bars are marked.
            </p>
            <table className="desk-table">
              <thead>
                <tr><th scope="col">Strictness</th><th scope="col">&ldquo;Same story&rdquo; right</th><th scope="col">Matches caught</th></tr>
              </thead>
              <tbody>
                {summary.sweep.rows.map((r) => {
                  const ok = r.precision !== null && r.recall !== null
                    && r.precision >= summary.gate.precision && r.recall >= summary.gate.recall;
                  const now = Math.abs(r.t - summary.sweep!.current) < 1e-9;
                  return (
                    <tr key={r.t} style={now ? { fontWeight: 700 } : undefined}>
                      <th scope="row">{r.t.toFixed(2)}{now ? " (today)" : ""}{ok ? " ✓" : ""}</th>
                      <td>{pct(r.precision)}</td>
                      <td>{pct(r.recall)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </>
  );
}

// ── The Bureau: check hidden summaries before readers see them (CEO T1) ──────
type BureauKeyNumber = { value?: string; unit?: string; label?: string; delta?: string } | null;
type BureauItem = {
  official_id: string; source: string; source_name?: string; source_url: string; issuer: string;
  ministry?: string | null; kind: string; title: string; published_at: string; what_changed: string;
  key_number: BureauKeyNumber; facts: string[]; who: string[]; dates: { label: string; date: string }[];
  analogy: string; summary: string; importance: string; importance_override?: string;
  verified_dropped: string[]; needs_desk: boolean; title_only?: boolean; source_text?: string;
};
type BureauSummary = {
  checked: number; facts_ok: number | null; readable: number | null; passed: boolean;
  gate: { facts: number; readable: number; min_checked: number };
  by_source: Record<string, { checked: number; facts_ok: number | null; readable: number | null }>;
  notes: { official_id: string; note: string }[];
};
type BureauHealth = {
  mode: string; alarm: boolean; llm_today?: number; llm_cap?: number;
  sources: Record<string, { silent: boolean; broken: boolean; kept_24h?: number; filtered_24h?: number; last_error?: string | null }>;
};

const SOURCE_LABEL: Record<string, string> = {
  pib: "PIB", rbi_press: "RBI press", rbi_notif: "RBI circulars", sebi: "SEBI",
  dgft: "DGFT", cbic: "CBIC", mospi: "MoSPI", gazette: "Gazette", parliament: "Parliament",
};
const KIND_LABEL: Record<string, string> = {
  cabinet_decision: "Cabinet decision", policy: "Policy", circular: "Circular", notification: "Notification",
  scheme: "Scheme", consultation: "Consultation", appointment: "Appointment", data_release: "Data",
  mou: "Agreement", statement: "Statement", event: "Event", bill: "Bill",
};

function BureauView({ api, back, toast }: { api: ReturnType<typeof useApi>; back: () => void; toast: (m: string) => void }) {
  const [items, setItems] = useState<BureauItem[] | null>(null);
  const [summary, setSummary] = useState<BureauSummary | null>(null);
  const [health, setHealth] = useState<BureauHealth | null>(null);
  const [i, setI] = useState(0);
  const [facts, setFacts] = useState<"" | "yes" | "no">("");
  const [readable, setReadable] = useState<"" | "yes" | "no">("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ items: BureauItem[]; summary: BureauSummary; health: BureauHealth }>("GET", "bureau/review");
      setItems(r.items); setSummary(r.summary); setHealth(r.health); setI(0); setErr("");
    } catch (e) { if ((e as HttpError).status !== 401) setErr((e as Error).message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  function next() { setFacts(""); setReadable(""); setNote(""); setI((n) => n + 1); window.scrollTo({ top: 0 }); }

  async function save() {
    if (!items || !facts || !readable) return;
    setBusy(true);
    try {
      setSummary(await api<BureauSummary>("POST", "bureau/labels", {
        official_id: items[i].official_id, facts_ok: facts === "yes", readable: readable === "yes", note: note.trim(),
      }));
      next();
    } catch (e) { if ((e as HttpError).status !== 401) setErr((e as Error).message); }
    setBusy(false);
  }

  async function setLevel(level: string) {
    if (!items) return;
    const it = items[i];
    try {
      await api("POST", `bureau/items/${it.official_id}/importance`, { level });
      setItems(items.map((x, k) => (k === i ? { ...x, importance_override: level } : x)));
      toast(`Importance set to ${level}`);
    } catch (e) { if ((e as HttpError).status !== 401) setErr((e as Error).message); }
  }

  const it = items && i < items.length ? items[i] : null;
  const kn = it?.key_number;
  const removed = (it?.verified_dropped || []).filter((d) => !["no_text", "llm_cap", "bad_json"].includes(d));

  return (
    <>
      <header className="desk-bar"><div className="desk-bar__inner">
        <button className="desk-back" type="button" onClick={back}><Chevron dir="left" /> Home</button>
      </div></header>
      <main className="desk-shell desk-draft desk-view">
        <p className="desk-kicker">The Bureau</p>
        <h1 className="desk-page-title">Check the summaries</h1>
        <p className="desk-hint" style={{ marginTop: 0 }}>
          Readers see nothing until {summary?.gate.min_checked ?? 30} checks show the facts right at least{" "}
          {summary ? pct(summary.gate.facts) : "95%"} of the time and easy to understand at least{" "}
          {summary ? pct(summary.gate.readable) : "85%"}.
        </p>
        {err && <div className="desk-notice desk-notice--bad" role="alert">{err}</div>}

        {health && (
          <div className="desk-chips" style={{ marginBottom: 18 }} aria-label="Sources">
            {Object.entries(health.sources).map(([name, s]) => (
              <span key={name} className="desk-chip" style={{ display: "inline-flex", alignItems: "center", cursor: "default",
                borderColor: s.broken ? "rgba(220,38,38,0.7)" : s.silent ? "rgba(245,158,11,0.7)" : undefined }}
                title={s.last_error || undefined}>
                {SOURCE_LABEL[name] || name}: {s.broken ? "broken" : s.silent ? "quiet too long" : `${s.kept_24h ?? 0} today`}
              </span>
            ))}
          </div>
        )}

        {!items ? <p className="desk-empty">Loading…</p> : it ? (
          <section className="desk-section" aria-live="polite">
            <p className="desk-row__meta" style={{ marginBottom: 10 }}>
              {i + 1} of {items.length} · {SOURCE_LABEL[it.source] || it.source} · {KIND_LABEL[it.kind] || it.kind} · {ago(it.published_at)}
            </p>

            <div className="desk-livecard" style={{ marginBottom: 12 }}>
              <p className="desk-row__meta" style={{ margin: "0 0 8px" }}>
                {it.issuer}{it.ministry ? ` · ${it.ministry}` : ""}
              </p>
              {kn && kn.value && (
                <p style={{ margin: "0 0 6px", font: "700 34px/1.05 var(--font-serif, Georgia, serif)" }}>
                  {kn.value}{kn.unit === "%" ? "%" : kn.unit ? ` ${kn.unit}` : ""}
                  {kn.delta && <span style={{ font: "600 14px var(--sans)", marginLeft: 10, color: "var(--desk-sub)" }}>{kn.delta} {kn.label || ""}</span>}
                </p>
              )}
              <p className="desk-livecard__line" style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontSize: 19 }}>{it.what_changed}</p>
              {it.facts.length > 0 && (
                <div className="desk-chips" style={{ margin: "10px 0" }}>
                  {it.facts.map((f) => <span key={f} className="desk-chip" style={{ cursor: "default", minHeight: 32 }}>{f}</span>)}
                </div>
              )}
              {it.analogy && <p className="desk-livecard__sub" style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontStyle: "italic", fontSize: 15 }}>Think of it like: {it.analogy}</p>}
              {it.who.length > 0 && <p className="desk-row__meta" style={{ marginTop: 8 }}>Who: {it.who.join(", ")}</p>}
              {it.dates.length > 0 && <p className="desk-row__meta">Dates: {it.dates.map((d) => `${d.label} ${d.date}`).join(" · ")}</p>}
              {it.summary && <p className="desk-livecard__sub" style={{ marginTop: 10, fontFamily: "var(--sans)", fontSize: 15, lineHeight: 1.55 }}>{it.summary}</p>}
            </div>

            {(it.title_only || it.needs_desk || removed.length > 0) && (
              <div className="desk-notice" role="note" style={{ marginBottom: 12 }}>
                {it.title_only && <p style={{ margin: 0 }}>No text could be read from the source: readers would see the title and a link.</p>}
                {removed.length > 0 && <p style={{ margin: 0 }}>Removed because the source doesn&apos;t say it: {removed.join(", ")}</p>}
                {it.needs_desk && !it.title_only && <p style={{ margin: 0 }}>Flagged for a closer look.</p>}
              </div>
            )}

            <details style={{ marginBottom: 16 }}>
              <summary className="desk-btn desk-btn--quiet" style={{ display: "inline-flex" }}>Compare with the source</summary>
              <p className="desk-row__meta" style={{ margin: "10px 0 6px" }}>
                <a href={it.source_url} target="_blank" rel="noopener noreferrer">Open the original ↗</a> · {it.title}
              </p>
              <div style={{ whiteSpace: "pre-wrap", maxHeight: 360, overflow: "auto", fontSize: 14, lineHeight: 1.55,
                padding: 12, border: "1px solid var(--desk-line)", borderRadius: 12, color: "var(--desk-sub)" }}>
                {it.source_text || "Source text wasn't kept for this older item. Use the link above."}
              </div>
            </details>

            <div className="desk-field">
              <span className="desk-label" id="bq-facts">Are the facts right?</span>
              <Choice label="Are the facts right?" value={facts} onChange={setFacts} variant="seg" describedBy="bq-facts"
                options={[{ v: "yes", label: "Yes, all right" }, { v: "no", label: "Something's wrong" }]} />
            </div>
            <div className="desk-field">
              <span className="desk-label" id="bq-read">Easy to understand?</span>
              <Choice label="Easy to understand?" value={readable} onChange={setReadable} variant="seg" describedBy="bq-read"
                options={[{ v: "yes", label: "Yes, clear" }, { v: "no", label: "Not really" }]} />
            </div>
            <div className="desk-field">
              <label className="desk-label" htmlFor="bq-note">What&apos;s off? (optional)</label>
              <textarea id="bq-note" className="desk-textarea" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. wrong amount, too long, missed the main point" />
            </div>
            <div className="desk-field">
              <span className="desk-label" id="bq-imp">Importance (changes what reaches the feed and pushes)</span>
              <Choice label="Importance" value={it.importance_override || it.importance} onChange={setLevel} variant="seg" describedBy="bq-imp"
                options={[{ v: "never", label: "Hide" }, { v: "low", label: "Low" }, { v: "normal", label: "Normal" }, { v: "high", label: "High" }]} />
            </div>
            <div className="desk-row-actions" style={{ marginTop: 6 }}>
              <button className="desk-btn desk-btn--primary" type="button" disabled={busy || !facts || !readable} onClick={save}>Save and next</button>
              <button className="desk-btn desk-btn--quiet" type="button" disabled={busy} onClick={next}>Skip</button>
            </div>
          </section>
        ) : (
          <section className="desk-section">
            <p className="desk-empty" style={{ textAlign: "left" }}>
              {items.length === 0 ? "Nothing new to check. The Bureau collects every 10 minutes by day; come back later." : "That's this batch done. Thank you."}
            </p>
            <button className="desk-btn desk-btn--block" type="button" onClick={load}>Load more</button>
          </section>
        )}

        {summary && summary.checked > 0 && (
          <section className="desk-section" aria-labelledby="bureau-score">
            <h2 className="desk-section__title" id="bureau-score">Score so far <span className="count">{summary.checked}</span></h2>
            <table className="desk-table">
              <tbody>
                <tr><th scope="row">Facts right</th><td>{pct(summary.facts_ok)} (needs {pct(summary.gate.facts)})</td></tr>
                <tr><th scope="row">Easy to understand</th><td>{pct(summary.readable)} (needs {pct(summary.gate.readable)})</td></tr>
                {Object.entries(summary.by_source).map(([s, v]) => (
                  <tr key={s}><th scope="row">{SOURCE_LABEL[s] || s}</th><td>{v.checked} checked · facts {pct(v.facts_ok)} · clear {pct(v.readable)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="desk-hint">
              {summary.checked < summary.gate.min_checked ? `Check at least ${summary.gate.min_checked} before deciding.`
                : summary.passed ? "Meets the bar. The Bureau can go live with app 1.14." : "Not there yet: the summaries need tuning first."}
            </p>
          </section>
        )}
      </main>
    </>
  );
}

// ── app ─────────────────────────────────────────────────────────────────────
function parseHash(): View {
  if (typeof window === "undefined") return { name: "home" };
  const [kind, id] = window.location.hash.replace(/^#/, "").split("/");
  if ((kind === "draft" || kind === "item" || kind === "event") && id && /^[A-Za-z0-9_-]{1,120}$/.test(id)) return { name: kind, id };
  if (kind === "push") return { name: "push" };
  if (kind === "newsroom") return { name: "newsroom" };
  if (kind === "golden") return { name: "golden" };
  if (kind === "bureau") return { name: "bureau" };
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
    window.location.hash = v.name === "home" ? "" : v.name === "push" || v.name === "newsroom" || v.name === "golden" || v.name === "bureau" ? v.name : `${v.name}/${v.id}`;
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
          <span style={{ display: "flex", gap: 4 }}>
            <button className="desk-btn desk-btn--quiet" type="button" onClick={() => open({ name: "newsroom" })}>Newsroom</button>
            <button className="desk-btn desk-btn--quiet" type="button" onClick={() => open({ name: "push" })}>Push</button>
            <button className="desk-btn desk-btn--quiet" type="button" onClick={() => open({ name: "bureau" })}>The Bureau</button>
            <button className="desk-btn desk-btn--quiet" type="button" onClick={signOut} title={email}>Sign out</button>
          </span>
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
      {view.name === "push" && <PushView api={api} back={() => open({ name: "home" })} toast={toast} />}
      {view.name === "newsroom" && <NewsroomView api={api} back={() => open({ name: "home" })} open={open} />}
      {view.name === "golden" && <GoldenView api={api} back={() => open({ name: "newsroom" })} />}
      {view.name === "bureau" && <BureauView api={api} back={() => open({ name: "home" })} toast={toast} />}
      {view.name === "event" && <EventView key={view.id} api={api} id={view.id} back={() => open({ name: "newsroom" })} open={open} toast={toast} />}
      {toastMsg && <div className="desk-toast" role="status">{toastMsg}</div>}
    </>
  );
}
