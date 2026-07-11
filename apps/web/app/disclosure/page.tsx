import type { Metadata } from "next";

import { DocShell } from "../../components/doc-shell";

export const metadata: Metadata = {
  title: "Affiliate Disclosure — FareSteal",
  description:
    "How FareSteal earns affiliate commission from travel partners, and how that affects (or doesn't affect) the price you pay.",
};

export default function DisclosurePage() {
  return (
    <DocShell title="Affiliate Disclosure" updated="11 July 2026">
      <p>
        FareSteal participates in affiliate programs, including the Travelpayouts partner network
        and its brands (such as Trip.com, Aviasales, and Kiwi.com). This means some of the outbound
        links on this site are affiliate links.
      </p>

      <h2>What this means for you</h2>
      <ul>
        <li>
          If you click one of these links and make a booking, we may receive a small referral
          commission from the provider.
        </li>
        <li>
          <strong>This never changes the price you pay.</strong> You pay exactly the same as you
          would by going to the provider directly.
        </li>
        <li>
          Commission does not influence our verdicts. Our &quot;grab it / fair / high&quot;
          assessment is based on tracked price history, not on which partner pays more.
        </li>
      </ul>

      <h2>Prices and availability</h2>
      <p>
        Fares shown on FareSteal are indicative and based on data that may be cached or delayed.
        The final price, taxes, baggage, and availability are always confirmed on the
        provider&apos;s own website at the time of booking.
      </p>

      <p className="note">
        We display this disclosure in line with standard affiliate-marketing practice so you always
        know when a link may earn us a commission. Questions? Email{" "}
        <a href="mailto:hello@faresteal.com">hello@faresteal.com</a>.
      </p>
    </DocShell>
  );
}
