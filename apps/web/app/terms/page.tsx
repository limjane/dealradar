import type { Metadata } from "next";

import { DocShell } from "../../components/doc-shell";

export const metadata: Metadata = {
  title: "Terms of Use — FareSteal",
  description: "The terms governing your use of the FareSteal website.",
};

export default function TermsPage() {
  return (
    <DocShell title="Terms of Use" updated="11 July 2026">
      <p>
        By using FareSteal (the &quot;Site&quot;), you agree to these terms. If you do not agree,
        please do not use the Site.
      </p>

      <h2>What FareSteal is</h2>
      <p>
        FareSteal is an informational price-comparison and content service for flights. We display
        indicative fares and price history and link out to third-party travel providers. We are not
        a travel agency, do not sell tickets, and do not process payments.
      </p>

      <h2>Accuracy of information</h2>
      <ul>
        <li>
          Fares, availability, and verdicts are provided &quot;as is&quot; and may be cached,
          delayed, or estimated. Always confirm the final price and details on the provider&apos;s
          website before booking.
        </li>
        <li>
          We are not responsible for the content, pricing, bookings, or conduct of third-party
          providers you are linked to.
        </li>
      </ul>

      <h2>Affiliate links</h2>
      <p>
        Some outbound links are affiliate links from which we may earn a commission at no extra cost
        to you. See our <a href="/disclosure">Affiliate Disclosure</a>.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You agree not to misuse the Site, including scraping at scale, attempting to disrupt it, or
        using it for unlawful purposes.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent permitted by law, FareSteal is not liable for any loss arising from reliance
        on information on the Site or from bookings made with third-party providers.
      </p>

      <p className="note">
        These terms may be updated from time to time. This is a general notice, not legal advice.
        Questions? <a href="mailto:hello@faresteal.com">hello@faresteal.com</a>.
      </p>
    </DocShell>
  );
}
