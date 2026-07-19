import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="inner">
        <div className="copy">© {new Date().getFullYear()} Chintan. Don&apos;t just consume. Contemplate.</div>
        <div className="links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/data-safety">Data &amp; Account Deletion</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
