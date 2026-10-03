import { APP_STORE_URL, PLAY_URL } from "./content";

const RAYS: [number, number, number, number][] = [
  [50, 8, 50, 22], [50, 78, 50, 92], [8, 50, 22, 50], [78, 50, 92, 50],
  [19, 19, 28, 28], [72, 72, 81, 81], [81, 19, 72, 28], [28, 72, 19, 81],
];

/** The Surya mark: a disc and eight rays. `animated` draws the rays in. */
export function Surya({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" data-animated={animated || undefined}>
      <circle className="surya-disc" cx="50" cy="50" r="15" />
      <g className="surya-rays" strokeWidth={6} strokeLinecap="round">
        {RAYS.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} style={{ "--r": i } as React.CSSProperties} />
        ))}
      </g>
    </svg>
  );
}

/** App Store + Google Play. Real links; both open the store listing. */
export function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`ld-badges ${className}`}>
      <a className="ld-badge" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Download Chintan on the App Store">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
        </svg>
        <span><small>Download on the</small>App Store</span>
      </a>
      <a className="ld-badge" href={PLAY_URL} target="_blank" rel="noopener noreferrer" aria-label="Get Chintan on Google Play">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
        </svg>
        <span><small>Get it on</small>Google Play</span>
      </a>
    </div>
  );
}
