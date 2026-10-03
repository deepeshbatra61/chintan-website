"use client";

import { useEffect } from "react";

// Sky by minute of the day: [minute, top OKLCH, horizon OKLCH] (L, C, H).
type LCH = [number, number, number];
const SKY: [number, LCH, LCH][] = [
  [330, [0.12, 0.012, 280], [0.14, 0.02, 300]],
  [450, [0.19, 0.045, 285], [0.43, 0.12, 48]],
  [570, [0.22, 0.05, 250], [0.33, 0.065, 68]],
  [720, [0.26, 0.05, 245], [0.29, 0.04, 215]],
  [900, [0.24, 0.045, 250], [0.32, 0.07, 62]],
  [1060, [0.2, 0.05, 280], [0.36, 0.11, 40]],
  [1170, [0.18, 0.07, 325], [0.4, 0.15, 30]],
  [1275, [0.13, 0.035, 285], [0.18, 0.05, 300]],
  [1360, [0.095, 0.012, 270], [0.115, 0.02, 280]],
];
const RISE = 360, SET = 1190; // sun up 6:00, down 19:50

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpHue = (a: number, b: number, t: number) => {
  let d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
};
const mix = (a: LCH, b: LCH, t: number): string =>
  `oklch(${lerp(a[0], b[0], t).toFixed(3)} ${lerp(a[1], b[1], t).toFixed(3)} ${lerpHue(a[2], b[2], t).toFixed(1)})`;

function skyAt(min: number): [string, string] {
  if (min <= SKY[0][0]) return [mix(SKY[0][1], SKY[0][1], 0), mix(SKY[0][2], SKY[0][2], 0)];
  for (let i = 1; i < SKY.length; i++) {
    if (min <= SKY[i][0]) {
      const t = (min - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]);
      return [mix(SKY[i - 1][1], SKY[i][1], t), mix(SKY[i - 1][2], SKY[i][2], t)];
    }
  }
  const last = SKY[SKY.length - 1];
  return [mix(last[1], last[1], 0), mix(last[2], last[2], 0)];
}

function clock(min: number): string {
  const m = Math.round(min) % 1440;
  const h24 = Math.floor(m / 60), mm = m % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(mm).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}
function label(min: number): string {
  if (min < 390) return "Before dawn";
  if (min < 540) return "Sunrise";
  if (min < 690) return "Morning";
  if (min < 810) return "Noon";
  if (min < 1080) return "Afternoon";
  if (min < 1230) return "Dusk";
  return "Night";
}

/** Drives the day behind the page from the scroll position: each chapter
 * declares its minute (data-min); the minute under the middle of the screen
 * is interpolated between chapters, and sky, sun, stars and clock follow it.
 * Also: word-by-word sharpening of the "shift" sentence, and arming the
 * vignettes so they play when they enter the screen. Content is complete
 * and visible without any of this. */
export default function DayDriver() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".ld");
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chapters = Array.from(root.querySelectorAll<HTMLElement>("[data-min]"));
    const timeEl = root.querySelector<HTMLElement>(".ld-clock__time");
    const labelEl = root.querySelector<HTMLElement>(".ld-clock__label");
    const hero = root.querySelector<HTMLElement>(".ld-hero");
    const scrub = root.querySelector<HTMLElement>("[data-scrub]");
    const words = scrub ? Array.from(scrub.querySelectorAll<HTMLElement>("span")) : [];

    let anchors: { y: number; min: number }[] = [];
    const measure = () => {
      const sy = window.scrollY;
      anchors = chapters.map((c) => {
        const r = c.getBoundingClientRect();
        return { y: sy + r.top + r.height / 2, min: Number(c.dataset.min) };
      });
      if (hero) anchors.unshift({ y: sy + hero.getBoundingClientRect().bottom - window.innerHeight * 0.2, min: 335 });
    };

    let lastMin = -1, raf = 0;
    const header = root.querySelector<HTMLElement>(".ld-top");
    const frame = () => {
      raf = 0;
      const vh = window.innerHeight;
      header?.classList.toggle("is-scrolled", window.scrollY > vh * 0.6);
      const mid = window.scrollY + vh * 0.55;
      let min = anchors[0]?.min ?? 330;
      for (let i = 1; i < anchors.length; i++) {
        if (mid <= anchors[i].y) {
          const a = anchors[i - 1], b = anchors[i];
          min = lerp(a.min, b.min, Math.min(1, Math.max(0, (mid - a.y) / (b.y - a.y))));
          break;
        }
        min = anchors[i].min;
      }
      if (Math.abs(min - lastMin) > 0.2) {
        lastMin = min;
        const [top, bot] = skyAt(min);
        const s = (min - RISE) / (SET - RISE);
        const up = s > -0.05 && s < 1.05;
        const sc = Math.min(1, Math.max(0, s));
        const x = 7 + 86 * sc;
        // A high arc: the sun lives in the top band, clear of the reading column.
        const y = 30 - Math.sin(Math.PI * sc) * 21; // % of viewport height
        const warm = Math.abs(sc - 0.5) * 2; // 1 at the horizon, 0 at noon
        const stars = Math.min(1, Math.max(0, (min - 1180) / 120));
        const st = root.style;
        st.setProperty("--sky-top", top);
        st.setProperty("--sky-bot", bot);
        st.setProperty("--sun-x", `${x}vw`);
        st.setProperty("--sun-y", `${y}vh`);
        st.setProperty("--sun-o", up ? String(0.8 * Math.min(1, Math.min(s + 0.05, 1.05 - s) * 8)) : "0");
        st.setProperty("--sun-warm", warm.toFixed(3));
        st.setProperty("--stars", stars.toFixed(3));
        st.setProperty("--clock-o", String(Math.min(1, Math.max(0, (min - 340) / 40))));
        if (timeEl) timeEl.textContent = clock(min);
        if (labelEl) labelEl.textContent = label(min);
      }
      // The shift sentence: words sharpen as the reader moves through it.
      if (scrub && !reduced) {
        const r = scrub.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (r.height + vh * 0.35)));
        const lit = p * words.length * 1.15;
        words.forEach((w, i) => { w.style.opacity = String(Math.min(1, Math.max(0.16, lit - i + 0.3))); });
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const onResize = () => { measure(); lastMin = -1; onScroll(); };

    measure();
    frame();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // Fonts and images shift layout after first paint: re-measure once settled.
    const settle = setTimeout(onResize, 900);

    // Vignettes: play when seen. Anything already on screen plays at once;
    // only vignettes below the fold get the hidden pre-state.
    const vigs = Array.from(root.querySelectorAll<HTMLElement>("[data-live]"));
    let io: IntersectionObserver | undefined;
    if (!reduced) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("is-live"); io?.unobserve(e.target); }
        });
      }, { threshold: 0.35 });
      vigs.forEach((v) => {
        if (v.getBoundingClientRect().top > window.innerHeight) { v.classList.add("is-armed"); io!.observe(v); }
      });
    }

    // Stars: drawn once per resize, faded in by --stars.
    const canvas = root.querySelector<HTMLCanvasElement>(".ld-stars");
    const drawStars = () => {
      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth, h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const n = Math.round((w * h) / 5200);
      for (let i = 0; i < n; i++) {
        const r = rnd() < 0.08 ? 1.3 : 0.7;
        ctx.globalAlpha = 0.25 + rnd() * 0.7;
        ctx.fillStyle = rnd() < 0.15 ? "#ffd9b3" : "#f4f1ff";
        ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h * 0.85, r, 0, Math.PI * 2); ctx.fill();
      }
    };
    drawStars();
    window.addEventListener("resize", drawStars);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("resize", drawStars);
      clearTimeout(settle);
      io?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
