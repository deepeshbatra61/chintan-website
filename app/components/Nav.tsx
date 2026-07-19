import Link from "next/link";

export default function Nav() {
  return (
    <nav>
      <div className="inner">
        <Link className="brand" href="/">
          <svg width="20" height="20" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="15" fill="#DC2626" />
            <g stroke="#DC2626" strokeWidth={6} strokeLinecap="round">
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
          Chintan
        </Link>
        <a className="cta" href="#download">
          Get the app
        </a>
      </div>
    </nav>
  );
}
