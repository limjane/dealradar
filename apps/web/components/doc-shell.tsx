import Link from "next/link";

import { SiteFooter } from "./site-footer";

/** Light-themed shell for content pages (about, privacy, terms, disclosure). */
export function DocShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="doc-header">
        <div className="inner">
          <Link href="/" className="logo-link">
            <span className="mark">✈</span>Fare<span style={{ fontWeight: 400 }}>Steal</span>
          </Link>
        </div>
      </header>
      <main className="doc">
        <h1>{title}</h1>
        {updated && <p className="updated">Last updated: {updated}</p>}
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
