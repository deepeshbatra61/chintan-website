"use client";

import { useEffect, useRef, useState } from "react";

/** One question, two faces. Turns over by itself once when it scrolls into
 * view (showing the side you weren't looking for), then the reader can turn
 * it back and forth. */
export default function OtherSide() {
  const [other, setOther] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const touched = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio > 0.6 && !touched.current) {
        touched.current = true;
        setTimeout(() => setOther(true), 700);
        io.disconnect();
      }
    }, { threshold: [0, 0.6, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pick = (v: boolean) => { touched.current = true; setOther(v); };

  return (
    <div className="ld-vig ld-other" ref={ref}>
      <p className="ld-other__q">Should cities close their old quarters to cars?</p>
      <div className="ld-other__switch" role="group" aria-label="Choose a view">
        <button type="button" aria-pressed={!other} onClick={() => pick(false)}>Your view</button>
        <button type="button" aria-pressed={other} onClick={() => pick(true)}>The other side</button>
        <span className="ld-other__thumb" data-other={other || undefined} aria-hidden="true" />
      </div>
      <div className="ld-other__coin" data-other={other || undefined}>
        <div className="ld-other__face ld-other__face--a" aria-hidden={other}>
          <p>Pedestrian streets are cleaner, safer and better for small shops. Old lanes were never built for traffic.</p>
        </div>
        <div className="ld-other__face ld-other__face--b" aria-hidden={!other}>
          <p>Traders, delivery workers and older residents depend on access. Bans can push traffic, and rents, onto the next neighbourhood.</p>
        </div>
      </div>
      <p className="ld-other__foot" aria-live="polite">{other ? "The credible case against, on every story." : "What you already think."}</p>
    </div>
  );
}
