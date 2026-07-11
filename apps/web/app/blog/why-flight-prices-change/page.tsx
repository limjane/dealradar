import type { Metadata } from "next";
import Link from "next/link";

import { DocShell } from "../../../components/doc-shell";

export const metadata: Metadata = {
  title: "Why flight prices change so much (and so fast) — FareSteal",
  description:
    "Fare buckets, revenue management, and why the seat next to you cost $200 less. How airline pricing really works, in plain English.",
};

export default function Post() {
  return (
    <DocShell title="Why flight prices change so much (and so fast)" updated="11 July 2026">
      <p>
        You search a flight on Monday: S$380. Wednesday: S$460. Friday: S$395. Nothing about the
        flight changed — same plane, same seats, same fuel. So what happened? The short answer:
        you watched an airline&apos;s revenue-management system doing its job in real time.
      </p>

      <h2>Fare buckets: one cabin, many prices</h2>
      <p>
        Airlines don&apos;t sell &quot;economy seats&quot; at one price. Each cabin is divided
        into invisible <strong>fare buckets</strong> — the same physical seat might exist in a
        dozen price classes from deep-discount to fully-flexible. When you search, you&apos;re
        shown the cheapest bucket that still has seats. When that bucket sells out, the price
        &quot;jumps&quot; — really, you&apos;re just seeing the next bucket up.
      </p>
      <p>
        This is also why prices seem to rise while you&apos;re searching. It&apos;s not your
        cookies — it&apos;s other travellers buying the last seats in the cheap bucket while you
        hesitate.
      </p>

      <h2>Revenue management: the constant re-forecast</h2>
      <p>
        Behind the buckets sits a forecasting system that re-estimates demand for every flight,
        continuously. Selling faster than expected? Close cheap buckets early. Selling slower?
        Reopen them — that&apos;s a &quot;price drop,&quot; and it&apos;s the moment fare
        trackers exist to catch. Big inputs include:
      </p>
      <ul>
        <li>
          <strong>Days to departure</strong> — leisure bookings come early and price-sensitive;
          late bookers are treated as business traffic and charged accordingly.
        </li>
        <li>
          <strong>Seasonality and events</strong> — school holidays, Lunar New Year, cherry
          blossom, a concert weekend at the destination.
        </li>
        <li>
          <strong>Competition</strong> — a budget carrier adding capacity on a route can drag
          everyone&apos;s cheap buckets open; a competitor cancelling flights does the opposite.
        </li>
      </ul>

      <h2>Why this is good news for travellers</h2>
      <p>
        Volatile pricing sounds hostile, but it creates the very dips deal-hunters live on. When
        a forecast misses — a flight selling slower than the airline hoped — cheap buckets reopen,
        sometimes dramatically. Those windows are usually brief (often under 48 hours) and
        invisible unless something is watching the route every day.
      </p>
      <p>
        That&apos;s the mechanic FareSteal is built on: we track the cheapest fare on each route
        daily (see any <Link href="/flights/sin-bkk">route page</Link>), so when a fare lands well below
        its tracked normal, it stands out immediately instead of slipping past.
      </p>

      <p className="note">
        Curious what the buckets are doing today? The <a href="/deals">live deals page</a> shows
        the cheapest tracked fares from Singapore right now.
      </p>
    </DocShell>
  );
}
