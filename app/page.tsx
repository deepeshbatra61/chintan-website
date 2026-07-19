import Nav from "./components/Nav";
import Footer from "./components/Footer";
import GlobeCanvas from "./components/GlobeCanvas";

export default function Home() {
  return (
    <>
      <Nav />

      <section className="hero" id="hero">
        <div className="hero-stage">
          <div className="hero-bg" />
          <GlobeCanvas />
          <div className="hero-content">
            <span className="eyebrow">Thoughtful reading, built for India</span>
            <h1>
              The news app for people
              <br />
              who read to <span className="accent">understand</span>.
            </h1>
            <p>
              Chintan replaces the infinite feed with three curated briefs a day, stories that
              update instead of repeating, and an AI that shows you the argument you weren&apos;t
              making.
            </p>
            <a className="hero-cta" href="#download">
              Download Chintan
            </a>
          </div>
          <div className="scroll-hint">Scroll</div>
        </div>
      </section>

      <section className="shift">
        <span className="eyebrow">The shift</span>
        <h2>
          Every other news app is built to keep you scrolling. Chintan is built to help you stop,
          and actually understand what happened.
        </h2>
        <p className="sub">
          No infinite feed. No engagement bait. Six ways Chintan works differently, below.
        </p>
      </section>

      <div className="section">
        <div className="feature-row">
          <div className="feature-visual" data-reveal="left">
            <div className="phone">
              <div className="screen">
                <div className="mock-brief">
                  <svg className="mark" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="15" fill="#F59E0B" />
                    <g stroke="#F59E0B" strokeWidth={5} strokeLinecap="round">
                      <line x1="50" y1="8" x2="50" y2="22" />
                      <line x1="50" y1="78" x2="50" y2="92" />
                      <line x1="8" y1="50" x2="22" y2="50" />
                      <line x1="78" y1="50" x2="92" y2="50" />
                      <line x1="19" y1="19" x2="28" y2="28" />
                      <line x1="72" y1="72" x2="81" y2="81" />
                      <line x1="81" y1="19" x2="72" y2="28" />
                      <line x1="28" y1="72" x2="19" y2="81" />
                    </g>
                  </svg>
                  <h4>Good morning</h4>
                  <div className="sub">6:12 AM · Three stories</div>
                  <div className="card">
                    <div className="num">01</div>
                    <p>
                      Petrol and diesel jump ₹4 a litre — the steepest single-day revision in
                      three years.
                    </p>
                  </div>
                  <div className="card">
                    <div className="num">02</div>
                    <p>OpenAI opens its first India office in Bengaluru.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="feature-text" data-reveal="right" style={{ transitionDelay: "100ms" }}>
            <span className="feature-num">01 / The Briefs Triptych</span>
            <h3>Three moments a day, not three hundred notifications.</h3>
            <p>
              Morning, midday, night — each brief distills what actually matters into three
              stories, written for the way your attention actually works across a day. No pressure
              to keep up. Just three chances to catch up.
            </p>
          </div>
        </div>

        <div className="feature-row reverse">
          <div className="feature-text" data-reveal="right">
            <span className="feature-num">02 / Developing Stories</span>
            <h3>Stories that update. Not sixteen versions of the same headline.</h3>
            <p>
              A single thread follows the story as it actually unfolds — an IPO closing, a
              protest&apos;s twists, an election count — instead of forcing you to piece it
              together from a dozen near-identical articles. Long-running situations (a border
              tension, an ongoing conflict) are tracked by intensity, so you see it flare up and
              quiet down over weeks, not just today.
            </p>
          </div>
          <div className="feature-visual" data-reveal="left" style={{ transitionDelay: "100ms" }}>
            <div className="phone">
              <div className="screen">
                <div className="mock-header" />
                <div className="mock-dev">
                  <div className="lbl">
                    <span className="d" />
                    Developing
                  </div>
                  <div className="t">
                    Zepto IPO anchor book nears closure — Norges, Motilal Oswal may take 40-45%
                  </div>
                </div>
                <div className="mock-card">
                  <div className="thumb" style={{ background: "linear-gradient(135deg,#3a2a1a,#1a1210)" }} />
                  <div>
                    <div className="cat">Business</div>
                    <div className="title">Sensex closes flat as IT stocks weigh on gains</div>
                  </div>
                </div>
                <div className="mock-card">
                  <div className="thumb" style={{ background: "linear-gradient(135deg,#1a2a3a,#101820)" }} />
                  <div>
                    <div className="cat">Technology</div>
                    <div className="title">ISRO confirms Gaganyaan crewed test for Q1 2027</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="feature-row">
          <div className="feature-visual" data-reveal="left">
            <div className="phone">
              <div className="screen">
                <div className="mock-other">
                  <div className="h">The Other Side</div>
                  <div className="lbl">Your view</div>
                  <div className="col">Everything you already agree with and believe in...</div>
                  <div className="lbl">The opposing view</div>
                  <div className="col other">
                    Consider the complexity of the other position before forming a final view...
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="feature-text" data-reveal="right" style={{ transitionDelay: "100ms" }}>
            <span className="feature-num">03 / The Other Side</span>
            <h3>The view you weren&apos;t looking for, on purpose.</h3>
            <p>
              Every story ships with an AI-generated look at the credible opposing perspective —
              not to change your mind, but to make sure you actually have one of your own, instead
              of the one an algorithm assembled for you.
            </p>
          </div>
        </div>

        <div className="feature-row reverse">
          <div className="feature-text" data-reveal="right">
            <span className="feature-num">04 / Ask Chintan</span>
            <h3>A reading companion, not a chatbot bolted on afterward.</h3>
            <p>
              Ask a follow-up question on any story and get a grounded answer in context — what a
              clause in a bill actually means, how a number compares historically, what happened
              before this story started. Built into the article, not a separate app you have to
              remember to open.
            </p>
          </div>
          <div className="feature-visual" data-reveal="left" style={{ transitionDelay: "100ms" }}>
            <div className="phone">
              <div className="screen">
                <div className="mock-ai">
                  <div className="bubble q">
                    Help me understand the nuances of the new digital privacy bill.
                  </div>
                  <div className="bubble a">
                    Beyond the headlines, three specific clauses shift the balance of who controls
                    your data...
                  </div>
                  <div className="bubble q">How does it compare to GDPR?</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="feature-row">
          <div className="feature-visual" data-reveal="left">
            <div className="phone">
              <div className="screen">
                <div className="mock-poll">
                  <div className="q">
                    Should platforms be required to label AI-generated news content?
                  </div>
                  <div className="opt">
                    <div className="bar" style={{ "--w": "71%" } as React.CSSProperties} />
                    <span>Yes, always — 71%</span>
                  </div>
                  <div className="opt">
                    <div className="bar" style={{ "--w": "19%" } as React.CSSProperties} />
                    <span>Only above a threshold — 19%</span>
                  </div>
                  <div className="opt">
                    <div className="bar" style={{ "--w": "10%" } as React.CSSProperties} />
                    <span>No, unnecessary — 10%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="feature-text" data-reveal="right" style={{ transitionDelay: "100ms" }}>
            <span className="feature-num">05 / Polls &amp; Community</span>
            <h3>See where the room actually stands, not just the loudest voice in it.</h3>
            <p>
              Every story carries a live poll and threaded discussion built for nuance over noise
              — a place to register a considered view, not just react.
            </p>
          </div>
        </div>

        <div className="feature-row reverse">
          <div className="feature-text" data-reveal="right">
            <span className="feature-num">06 / Your Interests</span>
            <h3>You choose what matters. Chintan builds around it from day one.</h3>
            <p>
              Politics, markets, cricket, culture, foreign affairs — pick what you actually care
              about, and go deeper into niches within each. No engagement-optimized guessing about
              what will keep you scrolling longest.
            </p>
          </div>
          <div className="feature-visual" data-reveal="left" style={{ transitionDelay: "100ms" }}>
            <div className="phone">
              <div className="screen">
                <div className="mock-interest">
                  <h5>Edit interests</h5>
                  <div className="sub">Pick your topics</div>
                  <div className="chip-grid">
                    <div className="chip on" style={{ "--i": 0 } as React.CSSProperties}>Politics</div>
                    <div className="chip on" style={{ "--i": 1 } as React.CSSProperties}>Markets</div>
                    <div className="chip" style={{ "--i": 2 } as React.CSSProperties}>Cricket</div>
                    <div className="chip on" style={{ "--i": 3 } as React.CSSProperties}>Foreign Affairs</div>
                    <div className="chip" style={{ "--i": 4 } as React.CSSProperties}>Bollywood</div>
                    <div className="chip on" style={{ "--i": 5 } as React.CSSProperties}>Technology</div>
                    <div className="chip" style={{ "--i": 6 } as React.CSSProperties}>Science</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="quote-block" data-reveal="blur">
        <blockquote>
          &ldquo;The ability to read for depth is being traded for the ability to scan for
          relevance.&rdquo;
        </blockquote>
        <cite>Why Chintan exists</cite>
      </div>

      <div className="download" id="download">
        <h2>Read like it still matters.</h2>
        <p>
          Chintan is live on Android. Download it, tell us what breaks, help us build the version
          that actually ships.
        </p>
        <div className="badges">
          <a className="badge primary" href="#">
            <span className="l1">Get it on</span>
            <span className="l2">Google Play</span>
          </a>
          <a className="badge" href="#">
            <span className="l1">Or use it in</span>
            <span className="l2">Your browser</span>
          </a>
        </div>
      </div>

      <Footer />
    </>
  );
}
