import type { Metadata } from "next";
import Link from "next/link";

import { POSTS } from "@/lib/posts";

import { SiteFooter } from "../../components/site-footer";

export const metadata: Metadata = {
  title: "Blog — FareSteal",
  description:
    "Data-driven guides on finding cheap flights: booking timing, fare pricing explained, and practical tips for travellers.",
};

export default function BlogIndex() {
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
        <h1>The FareSteal blog</h1>
        <p className="updated">Data-driven guides to paying less for flights</p>

        {POSTS.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="post-card">
            <span className="tag">{p.tag}</span>
            <h3>{p.title}</h3>
            <p>{p.description}</p>
          </Link>
        ))}
      </main>

      <SiteFooter />
    </>
  );
}
