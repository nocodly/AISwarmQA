import type { Metadata } from "next";
import { MarketingTopicPage } from "../../components/MarketingTopicPage";
import { getMarketingPage } from "../../lib/marketing-pages";

export const metadata: Metadata = {
  title: "Accessibility Testing",
  description: "Accessibility signals for keyboard, focus, mobile navigation, semantic issues, and evidence-rich QA findings."
};

export default function AccessibilityTestingPage() {
  return <MarketingTopicPage page={getMarketingPage("accessibility-testing")!} />;
}
