"use client";

import { useEffect, useRef } from "react";
import { NOISE } from "./content";

const COLS = 6;

/** The endless feed the hero opens inside. Columns of headlines race upward,
 * then decelerate to near stillness: the page's first act is to stop the
 * scroll. CSS runs the loop; this only bends its speed. Off-screen it pauses. */
export default function Torrent() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.add("is-still");
      return;
    }
    const anims = root.getAnimations({ subtree: true });
    const FAST = 7, SLOW = 0.08, HOLD = 700, EASE_MS = 2600;
    anims.forEach((a) => (a.playbackRate = FAST));
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - t0 - HOLD) / EASE_MS));
      const k = 1 - Math.pow(1 - t, 4); // ease-out-quart
      const rate = FAST + (SLOW - FAST) * k;
      anims.forEach((a) => (a.playbackRate = rate));
      if (t > 0.35) root.classList.add("is-still");
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // Pause the loop when the hero is off screen.
    const io = new IntersectionObserver(([e]) => {
      root.classList.toggle("is-away", !e.isIntersecting);
    });
    io.observe(root);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <div className="ld-torrent" ref={ref} aria-hidden="true">
      {Array.from({ length: COLS }, (_, c) => {
        // Deterministic per-column order (same on server and client).
        const items = NOISE.map((_, i) => NOISE[(i * (c + 3) + c * 5) % NOISE.length]);
        return (
          <div key={c} className="ld-torrent__col" style={{ "--d": `${44 + ((c * 7) % 5) * 6}s`, "--o": `${-((c * 13) % 9)}s` } as React.CSSProperties}>
            <div className="ld-torrent__run">
              {[...items, ...items].map((h, i) => <p key={i} className={i % 5 === 2 ? "is-loud" : undefined}>{h}</p>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
