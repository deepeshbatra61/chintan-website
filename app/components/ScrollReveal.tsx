"use client";

import { useEffect } from "react";

/**
 * Drives every scroll-triggered motion on the page: directional reveals
 * ([data-reveal]), the poll-bar fill, the interest-chip stagger, and the
 * nav's scrolled state. Renders nothing — pure side effect.
 *
 * Every element this touches is fully visible in its base CSS with no
 * class applied; this only ever *adds* a temporary hidden pre-state
 * (`.reveal-init`) right before observing, so a crawler, no-JS browser,
 * or a tab that never gets a paint still sees complete content.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal], .chip-grid, .mock-poll")
    );

    let io: IntersectionObserver | undefined;

    if (!reducedMotion) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("revealed");
              io?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
      );

      for (const el of targets) {
        el.classList.add("reveal-init");
        io.observe(el);
      }
    }
    // reducedMotion: leave every element in its already-visible default — no motion.

    const nav = document.querySelector("nav");
    function onScroll() {
      if (!nav) return;
      if (window.scrollY > 40) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
