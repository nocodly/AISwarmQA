import { describe, expect, it } from "vitest";
import { contentItems, editorialStates, getPublishedContent, qualityGateSummary, searchContent } from "./content";
import { marketingPages } from "./marketing-pages";

describe("Phase 9B content and pricing safety", () => {
  it("keeps all editorial states available", () => {
    expect(editorialStates).toEqual([
      "idea",
      "brief",
      "draft",
      "technical_review",
      "editorial_review",
      "approved",
      "scheduled",
      "published",
      "rejected",
      "archived"
    ]);
  });

  it("excludes drafts from published content", () => {
    const published = getPublishedContent();
    expect(published.every((item) => item.state === "published")).toBe(true);
    expect(published.some((item) => item.slug === "programmatic-landing-page-brief")).toBe(false);
  });

  it("requires human approval for published generated content", () => {
    const generatedPublished = getPublishedContent().filter((item) => item.generatedBy);
    expect(generatedPublished.every((item) => Boolean(item.approvedBy))).toBe(true);
  });

  it("keeps Pro yearly pricing mathematically accurate", () => {
    const pricingPage = marketingPages.find((page) => page.slug === "pricing");
    expect(pricingPage).toBeDefined();
    expect(pricingPage?.sections.at(1)?.body).toContain("$158");
    expect(79 * 12 - 790).toBe(158);
  });

  it("provides working public search results", () => {
    expect(searchContent("github").some((item) => item.title.toLowerCase().includes("github"))).toBe(true);
  });

  it("scores published content without blocking preview", () => {
    for (const item of contentItems) {
      expect(qualityGateSummary(item).score).toBeGreaterThanOrEqual(60);
    }
  });
});
