import type { MetadataRoute } from "next";
import { appUrl } from "../components/MarketingShell";
import { getPublishedContent } from "../lib/content";
import { publishedMarketingRoutes } from "../lib/marketing-pages";

const staticRoutes = ["/", "/blog", "/docs", "/compare", "/integrations", "/use-cases", "/glossary", "/changelog", "/privacy", "/terms", "/imprint", "/search"];

export default function sitemap(): MetadataRoute.Sitemap {
  const contentRoutes = getPublishedContent().map((item) => `/${item.collection}/${item.slug}`);
  return [...staticRoutes, ...publishedMarketingRoutes, ...contentRoutes].map((route) => ({
    url: appUrl(route),
    lastModified: new Date("2026-07-27"),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route.includes("/docs") ? 0.8 : 0.7
  }));
}
