import type { Metadata } from "next";
import { MarketingTopicPage } from "../../components/MarketingTopicPage";
import { getMarketingPage } from "../../lib/marketing-pages";

export const metadata: Metadata = {
  title: "Mobile Testing",
  description: "Mobile QA checks for responsive product flows, mobile navigation, touch targets, and GitHub-ready findings."
};

export default function MobileTestingPage() {
  return <MarketingTopicPage page={getMarketingPage("mobile-testing")!} />;
}
