import type { MetadataRoute } from "next";

import { POSTS } from "@/lib/posts";
import { ROUTE_SLUGS } from "@/lib/routes-meta";

const BASE = "https://www.faresteal.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages: { path: string; freq: "daily" | "monthly"; priority: number }[] = [
    { path: "", freq: "daily", priority: 1 },
    { path: "/deals", freq: "daily", priority: 0.9 },
    { path: "/blog", freq: "monthly", priority: 0.6 },
    { path: "/about", freq: "monthly", priority: 0.5 },
    { path: "/disclosure", freq: "monthly", priority: 0.4 },
    { path: "/privacy", freq: "monthly", priority: 0.3 },
    { path: "/terms", freq: "monthly", priority: 0.3 },
  ];

  return [
    ...staticPages.map((p) => ({
      url: `${BASE}${p.path}`,
      lastModified: now,
      changeFrequency: p.freq,
      priority: p.priority,
    })),
    ...ROUTE_SLUGS.map((slug) => ({
      url: `${BASE}/flights/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...POSTS.map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
