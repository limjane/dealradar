/** Blog post registry — index page + sitemap read from here. Articles live in app/blog/<slug>/page.tsx. */

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  tag: string;
  date: string; // YYYY-MM-DD
};

export const POSTS: PostMeta[] = [
  {
    slug: "how-to-find-cheap-flights-from-singapore",
    title: "How to actually find cheap flights from Singapore",
    description:
      "Forget incognito-mode myths. A practical, data-driven playbook for paying less on flights out of Changi.",
    tag: "Guide",
    date: "2026-07-11",
  },
  {
    slug: "best-time-to-book-flights",
    title: "When is the best time to book a flight?",
    description:
      "The honest answer: it depends on the route — but price history beats booking-day folklore every time.",
    tag: "Data",
    date: "2026-07-11",
  },
  {
    slug: "why-flight-prices-change",
    title: "Why flight prices change so much (and so fast)",
    description:
      "Fare buckets, revenue management, and why the seat next to you cost $200 less. How airline pricing really works.",
    tag: "Explainer",
    date: "2026-07-11",
  },
  {
    slug: "one-way-vs-return-flights-in-asia",
    title: "One-way vs return: the Asia budget-carrier hack",
    description:
      "In Southeast Asia, two one-ways often beat a return fare. When mixing airlines saves real money — and when it backfires.",
    tag: "Tips",
    date: "2026-07-11",
  },
];
