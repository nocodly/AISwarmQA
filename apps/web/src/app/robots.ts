import type { MetadataRoute } from "next";
import { appUrl } from "../components/MarketingShell";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/api/", "/admin/", "/dashboard", "/billing", "/settings", "/onboarding", "/projects", "/audits"]
      }
    ],
    sitemap: appUrl("/sitemap.xml")
  };
}
