import type { Metadata } from "next";

import { DocShell } from "../../components/doc-shell";

export const metadata: Metadata = {
  title: "About FareSteal — flight price intelligence",
  description:
    "FareSteal tracks flight fares daily and tells you whether today's price is actually a good deal, based on real price history.",
};

export default function AboutPage() {
  return (
    <DocShell title="About FareSteal">
      <p>
        FareSteal is a flight price-intelligence service for travellers flying out of Singapore
        and Southeast Asia. We track fares on popular routes every day and compare today&apos;s
        price against its recent history, so you can tell at a glance whether a fare is genuinely
        cheap — or whether it&apos;s worth waiting.
      </p>

      <h2>What we do</h2>
      <ul>
        <li>Track the cheapest fares on selected routes daily and build a price history.</li>
        <li>
          Show a clear verdict — is this price a steal, fair, or high — based on that history.
        </li>
        <li>
          Link you out to trusted travel providers (Trip.com, Aviasales, Kiwi and others) to book
          at their price.
        </li>
      </ul>

      <h2>How we make money</h2>
      <p>
        FareSteal is free to use. When you click through to a partner and book, we may earn a
        small referral commission from that partner. It never adds anything to the price you pay.
        See our <a href="/disclosure">Affiliate Disclosure</a> for details.
      </p>

      <h2>Get in touch</h2>
      <p>
        Questions, feedback, or a route you&apos;d like us to track? Email{" "}
        <a href="mailto:hello@faresteal.com">hello@faresteal.com</a>.
      </p>

      <p className="note">
        FareSteal is an independent price-comparison and content service. We are not a travel
        agency and do not sell tickets or process payments — all bookings are completed on the
        provider&apos;s own website.
      </p>
    </DocShell>
  );
}
