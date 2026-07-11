import type { Metadata } from "next";

import { DocShell } from "../../components/doc-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — FareSteal",
  description: "How FareSteal collects, uses, and protects your data. PDPA-aware.",
};

export default function PrivacyPage() {
  return (
    <DocShell title="Privacy Policy" updated="11 July 2026">
      <p>
        FareSteal (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy explains what
        we collect and why. We aim to collect as little personal data as possible. It is written to
        align with Singapore&apos;s Personal Data Protection Act (PDPA).
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Email address</strong> — only if you sign up for price-drop alerts. We use it
          solely to send the alerts you asked for. You can unsubscribe at any time via the link in
          every email.
        </li>
        <li>
          <strong>Usage data</strong> — basic, aggregated analytics (pages visited, general region,
          device type) to improve the site. This does not identify you personally.
        </li>
        <li>
          <strong>Click data</strong> — when you click an outbound deal link, we record the click
          (with a hashed, non-identifying reference) for commission accounting.
        </li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell or rent your personal data to anyone.</li>
        <li>We do not require an account, and we do not collect payment information.</li>
        <li>We do not store more than we need to run the alerts and the service.</li>
      </ul>

      <h2>Third parties</h2>
      <p>
        When you click through to a travel provider, that provider&apos;s own privacy policy applies
        to anything you do on their site. We use reputable infrastructure providers (hosting,
        database, email delivery) that process data on our behalf under their own safeguards.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the PDPA you may request access to, correction of, or deletion of the personal data we
        hold about you (in practice, your alert email). Email{" "}
        <a href="mailto:hello@faresteal.com">hello@faresteal.com</a> and we&apos;ll action it.
      </p>

      <p className="note">
        This policy may be updated as the service grows; the &quot;last updated&quot; date above
        will change. This is a general privacy notice, not legal advice.
      </p>
    </DocShell>
  );
}
