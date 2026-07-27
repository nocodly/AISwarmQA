import type { Metadata } from "next";
import { MarketingTopicPage } from "../../components/MarketingTopicPage";
import { getMarketingPage } from "../../lib/marketing-pages";

export const metadata: Metadata = {
  title: "Playwright Testing",
  description: "Playwright-powered QA with AI planning, evidence capture, normalized findings, and GitHub export."
};

export default function PlaywrightTestingPage() {
  return <MarketingTopicPage page={getMarketingPage("playwright-testing")!} />;
}
