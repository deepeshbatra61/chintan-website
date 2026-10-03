import Link from "next/link";
import { Manrope } from "next/font/google";
import Torrent from "./landing/Torrent";
import DayDriver from "./landing/DayDriver";
import OtherSide from "./landing/OtherSide";
import { Surya, StoreBadges } from "./landing/bits";
import { BRIEF, THREAD, OUTLETS } from "./landing/content";
import "./landing/landing.css";

// Manrope is the app's body face; the site's home page shares it so the
// page and the app read as one family (Playfair comes from the root layout).
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manrope", display: "swap" });

const SPLIT = "Every other news app is built to keep you scrolling. Chintan is built to help you stop, and actually understand what happened.";

export default function Home() {
  return (
    <div className={`ld ${manrope.variable}`}>
      {/* The day, drawn behind the page: sky, sun, stars, clock */}
      <div className="ld-sky" aria-hidden="true" />
      <canvas className="ld-stars" aria-hidden="true" />
      <div className="ld-sun" aria-hidden="true"><Surya className="ld-sun__mark" /></div>
      <p className="ld-clock" aria-hidden="true"><span className="ld-clock__time">6:00 AM</span><span className="ld-clock__label">Before dawn</span></p>

      <header className="ld-top">
        <Link className="ld-brand" href="/" aria-label="Chintan home">
          <Surya className="ld-brand__mark" />
          <span>Chintan</span>
        </Link>
        <a className="ld-top__cta" href="#download">Get the app</a>
      </header>

      {/* ── Hero: inside the endless feed, then stillness ── */}
      <section className="ld-hero" aria-labelledby="ld-h1">
        <Torrent />
        <div className="ld-hero__veil" aria-hidden="true" />
        <div className="ld-hero__inner">
          <Surya className="ld-hero__sun" animated />
          <h1 id="ld-h1" className="ld-hero__title">
            <span className="ld-hero__l1">Don&apos;t just consume.</span>
            <span className="ld-hero__l2">Contemplate.</span>
          </h1>
          <p className="ld-hero__lede">The news app for people who read to <em>understand</em>.</p>
          <p className="ld-hero__body">
            Chintan replaces the infinite feed with three curated briefs a day, stories that update
            instead of repeating, and an AI that shows you the argument you weren&apos;t making.
            Thoughtful reading, built for India.
          </p>
          <StoreBadges className="ld-hero__badges" />
        </div>
        <a className="ld-hero__hint" href="#ld-shift">Spend a day with Chintan</a>
      </section>

      {/* ── The shift: the sentence sharpens as you read it ── */}
      <section className="ld-shift" id="ld-shift" aria-label="Why Chintan is different">
        <p className="ld-shift__text" data-scrub>
          {SPLIT.split(" ").map((w, i) => <span key={i}>{w} </span>)}
        </p>
        <p className="ld-shift__sub">No infinite feed. No engagement bait. Just one day, the way Chintan sees it.</p>
      </section>

      <main className="ld-day">
        {/* 07:30 · Sunrise brief */}
        <section className="ld-ch ld-ch--brief" data-min="450" aria-labelledby="ch-brief">
          <div className="ld-ch__copy">
            <p className="ld-time">7:30 <small>AM</small></p>
            <h2 id="ch-brief">Three moments a day, not three hundred notifications.</h2>
            <p>
              Morning, midday, night: each brief distils what actually matters into three stories,
              written for the way your attention works across a day. No pressure to keep up. Just
              three chances to catch up, and one quiet notification when each is ready.
            </p>
          </div>
          <div className="ld-vig ld-brief" data-live>
            <div className="ld-push">
              <Surya className="ld-push__icon" />
              <div><strong>Chintan · Sunrise</strong><span>Your three for the morning are ready.</span></div>
              <time>now</time>
            </div>
            <div className="ld-brief__sheet">
              <p className="ld-brief__hello">Good morning</p>
              <p className="ld-brief__meta">7:30 AM · Three stories</p>
              <ol>
                {BRIEF.map((s, i) => <li key={i} style={{ "--i": i } as React.CSSProperties}><span>{i + 1}</span>{s}</li>)}
              </ol>
            </div>
          </div>
        </section>

        {/* 09:10 · Interests, sub-topics, States, Health */}
        <section className="ld-ch ld-ch--interests" data-min="550" aria-labelledby="ch-int">
          <div className="ld-ch__copy">
            <p className="ld-time">9:10 <small>AM</small></p>
            <h2 id="ch-int">You choose what matters. Chintan builds around it from day one.</h2>
            <p>
              Politics, markets, cricket, culture, foreign affairs: pick what you actually care about,
              then go a level deeper, Cricket or Hockey, Markets or Startups. Choose your state and its
              news comes first. Health has its own section now. No engagement-optimised guessing about
              what will keep you scrolling longest.
            </p>
          </div>
          <div className="ld-vig ld-chips" data-live aria-hidden="true">
            <div className="ld-chips__row">
              {["All", "Politics", "Business", "Sports", "Health", "World", "States"].map((c) => (
                <span key={c} className={`ld-chip${c === "Sports" ? " is-on" : ""}`}>{c}</span>
              ))}
            </div>
            <div className="ld-chips__sub">
              {["All", "Cricket", "Hockey", "Football", "Chess", "Tennis"].map((c, i) => (
                <span key={c} className={`ld-pill${c === "Hockey" ? " is-on" : ""}`} style={{ "--i": i } as React.CSSProperties}>{c}</span>
              ))}
            </div>
            <div className="ld-chips__states">
              <span className="ld-chips__label">Your state first</span>
              {["Maharashtra", "Kerala", "Punjab", "Assam", "More states ›"].map((c, i) => (
                <span key={c} className={`ld-pill${i === 0 ? " is-on" : ""}`} style={{ "--i": i } as React.CSSProperties}>{c}</span>
              ))}
            </div>
          </div>
        </section>

        {/* 12:00 · Developing, Follow, Since you looked */}
        <section className="ld-ch ld-ch--dev" data-min="720" aria-labelledby="ch-dev">
          <div className="ld-ch__copy">
            <p className="ld-time">12:00 <small>PM</small></p>
            <h2 id="ch-dev">Stories that update. Not sixteen versions of the same headline.</h2>
            <p>
              A single thread follows the story as it actually unfolds: an IPO closing, a cyclone
              making landfall, an election count. Follow it and Chintan tells you when it moves; come
              back later and it marks exactly what&apos;s new since you looked. Long-running situations
              are tracked by intensity, so you see them flare up and quiet down over weeks.
            </p>
          </div>
          <div className="ld-vig ld-dev" data-live>
            <div className="ld-dev__head">
              <span className="ld-dev__badge"><i />Developing</span>
              <p className="ld-dev__title">Cyclone in the Bay of Bengal</p>
              <span className="ld-dev__follow"><span className="ld-dev__f1">Follow</span><span className="ld-dev__f2"><svg className="ld-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4 6.6 11.4 12.5 4.8" /></svg>Following</span></span>
            </div>
            <ol className="ld-dev__thread">
              {THREAD.map((u, i) => (
                <li key={i} className={u.fresh ? "is-fresh" : ""} style={{ "--i": THREAD.length - 1 - i } as React.CSSProperties}>
                  {i === 1 && <span className="ld-dev__since">New since you looked · 9:40 AM</span>}
                  <time>{u.t}</time>
                  <p>{u.text}</p>
                  <span className="ld-dev__src">{u.outlet}</span>
                </li>
              )).reverse()}
            </ol>
            <div className="ld-ping" role="presentation">
              <Surya className="ld-push__icon" />
              <div><strong>Following · Cyclone in the Bay</strong><span>Railways cancels 40 trains along the coast until Friday.</span></div>
            </div>
          </div>
        </section>

        {/* 14:30 · Coverage: many outlets fold into one story */}
        <section className="ld-ch ld-ch--cov" data-min="870" aria-labelledby="ch-cov">
          <div className="ld-ch__copy">
            <p className="ld-time">2:30 <small>PM</small></p>
            <h2 id="ch-cov">Many outlets, one story. And you can see who&apos;s covering it.</h2>
            <p>
              When a dozen outlets report the same event, Chintan folds them into one story instead of
              a dozen near-identical cards, and shows you the mix behind it: national, regional and
              international. Fewer repeats, more voices.
            </p>
          </div>
          <div className="ld-vig ld-cov" data-live aria-hidden="true">
            <div className="ld-cov__stack">
              {["Cyclone to make landfall near Puri tonight", "BREAKING: Cyclone heads for Odisha coast", "Cyclone landfall tonight, IMD says", "Odisha on alert as cyclone nears", "LIVE: Cyclone landfall updates", "Watch: Cyclone nears the coast"].map((h, i) => (
                <p key={i} style={{ "--i": i } as React.CSSProperties}>{h}</p>
              ))}
            </div>
            <div className="ld-cov__card">
              <p className="ld-cov__cat">Weather · Odisha</p>
              <p className="ld-cov__title">IMD: landfall near Puri tonight, winds up to 110 km/h</p>
              <div className="ld-cov__strip">
                <span className="ld-cov__dots">
                  {OUTLETS.map((o, i) => <i key={i} className={`g-${o.g}`} style={{ "--i": i } as React.CSSProperties}>{o.i}</i>)}
                </span>
                <span>6 outlets: 3 national, 2 regional, 1 international</span>
              </div>
              <span className="ld-cov__bar"><b style={{ flex: 3 }} className="g-national" /><b style={{ flex: 2 }} className="g-regional" /><b style={{ flex: 1 }} className="g-international" /></span>
            </div>
          </div>
        </section>

        {/* 16:40 · Ask Chintan */}
        <section className="ld-ch ld-ch--ask" data-min="1000" aria-labelledby="ch-ask">
          <div className="ld-ch__copy">
            <p className="ld-time">4:40 <small>PM</small></p>
            <h2 id="ch-ask">A reading companion, not a chatbot bolted on afterward.</h2>
            <p>
              Ask a follow-up on any story and get a grounded answer in context: what a clause in a
              bill actually means, how a number compares historically, what happened before this
              story started. Built into the article, and every answer copies with a tap.
            </p>
          </div>
          <div className="ld-vig ld-ask" data-live aria-hidden="true">
            <p className="ld-bub ld-bub--q">Help me understand the nuances of the new digital privacy bill.</p>
            <div className="ld-bub ld-bub--a">
              <p>
                {"Beyond the headlines, three clauses shift who controls your data: how consent is recorded, when the government can be exempt, and what a breach costs a company.".split(" ").map((w, i) => (
                  <span key={i} style={{ "--i": i } as React.CSSProperties}>{w} </span>
                ))}
              </p>
              <span className="ld-copy"><svg className="ld-ico" viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="2" /><path d="M10.5 3.5v-.2A1.8 1.8 0 0 0 8.7 1.5H4.3a1.8 1.8 0 0 0-1.8 1.8v4.4a1.8 1.8 0 0 0 1.8 1.8h.2" /></svg>Copy</span>
            </div>
            <p className="ld-bub ld-bub--q ld-bub--late">How does it compare to GDPR?</p>
          </div>
        </section>

        {/* 19:30 · Dusk: The Other Side */}
        <section className="ld-ch ld-ch--other" data-min="1170" aria-labelledby="ch-other">
          <div className="ld-ch__copy">
            <p className="ld-time">7:30 <small>PM</small></p>
            <h2 id="ch-other">The view you weren&apos;t looking for, on purpose.</h2>
            <p>
              Every story ships with an AI-written look at the credible opposing perspective. Not to
              change your mind, but to make sure you actually have one of your own, instead of the
              one an algorithm assembled for you.
            </p>
          </div>
          <OtherSide />
        </section>

        {/* 21:15 · Polls & community */}
        <section className="ld-ch ld-ch--poll" data-min="1275" aria-labelledby="ch-poll">
          <div className="ld-ch__copy">
            <p className="ld-time">9:15 <small>PM</small></p>
            <h2 id="ch-poll">See where the room actually stands, not just the loudest voice in it.</h2>
            <p>
              Every story carries a live poll and a threaded discussion built for nuance over noise: a
              place to register a considered view, not just react.
            </p>
          </div>
          <div className="ld-vig ld-poll" data-live aria-hidden="true">
            <p className="ld-poll__q">Should platforms be required to label AI-generated news?</p>
            {[["Yes, always", 71, true], ["Only above a threshold", 19, false], ["No, unnecessary", 10, false]].map(([label, p, mine], i) => (
              <div key={i} className={`ld-poll__opt${mine ? " is-mine" : ""}`} style={{ "--p": `${p}%`, "--i": i } as React.CSSProperties}>
                <b />
                <span>{mine && <svg viewBox="0 0 16 16" width="15" height="15"><circle cx="8" cy="8" r="7" /><path d="M4.6 8.3 7 10.6l4.4-4.9" /></svg>}{label as string}</span>
                <em>{p as number}%</em>
              </div>
            ))}
            <p className="ld-poll__note">Vote counted</p>
          </div>
        </section>

        {/* 22:40 · Night: why, and the download */}
        <section className="ld-ch ld-ch--night" data-min="1360" aria-labelledby="ch-night">
          <figure className="ld-quote">
            <blockquote>&ldquo;The ability to read for depth is being traded for the ability to scan for relevance.&rdquo;</blockquote>
            <figcaption>Why Chintan exists</figcaption>
          </figure>
          <div className="ld-download" id="download">
            <h2 id="ch-night">Read like it still matters.</h2>
            <p>
              Chintan is live on Android and iPhone. Download it, tell us what breaks, and help us
              build the version that actually ships.
            </p>
            <StoreBadges />
            <p className="ld-tomorrow"><Surya className="ld-tomorrow__sun" />Tomorrow&apos;s Sunrise brief lands at 7:30 AM.</p>
          </div>
        </section>
      </main>

      <footer className="ld-foot">
        <p>© {new Date().getFullYear()} Chintan. Don&apos;t just consume. Contemplate.</p>
        <nav aria-label="Site">
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/data-safety">Data &amp; Account Deletion</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </footer>

      <DayDriver />
    </div>
  );
}
