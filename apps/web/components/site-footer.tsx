import Link from "next/link";

/** Shared footer with legal/trust nav + affiliate-commission disclosure. Used on every page. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="inner">
        <div className="row1">
          <div className="logo">
            <span className="mark">✈</span>Fare<span style={{ fontWeight: 400 }}>Steal</span>
          </div>
          <nav className="foot-nav">
            <Link href="/">Home</Link>
            <Link href="/deals">Deals</Link>
            <Link href="/about">About</Link>
            <Link href="/disclosure">Affiliate disclosure</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
        <p className="disc">
          FareSteal compares fares and shows price history. Bookings happen on the airline or
          travel provider&apos;s own website — we may earn a commission from partners, which never
          changes the price you pay. Fares shown are illustrative until live pricing is confirmed
          on the provider&apos;s site.
        </p>
        <p className="copy">
          © 2026 FareSteal · Flight price intelligence for Singapore travellers ·{" "}
          <a href="mailto:hello@faresteal.com" style={{ color: "inherit" }}>
            hello@faresteal.com
          </a>
        </p>
      </div>
    </footer>
  );
}
