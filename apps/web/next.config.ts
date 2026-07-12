import type { NextConfig } from "next";

/**
 * Security headers — foundation §4.6 (one-time scaffold setup).
 *
 * CSP posture at scaffold: locked to 'self' with 'unsafe-inline' still permitted
 * for styles/scripts because Next's runtime injects inline bootstrap and Tailwind
 * injects inline styles. Task 9 (launch pass) tightens this to nonce-based CSP via
 * middleware — tracked in decisions.md. Everything else below is production-final.
 *
 * `unsafe-eval` is dev-only: Next's dev-mode webpack runtime (HMR/react-refresh)
 * wraps modules in `eval()`, which script-src silently blocks without it — the page
 * still server-renders fine (CSP doesn't affect SSR), so the symptom is "everything
 * looks right but nothing is clickable," not a visible error. Production builds don't
 * eval, so prod stays without it.
 */
const isDev = process.env.NODE_ENV !== "production";
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.travelpayouts.com https://*.aviasales.com",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
