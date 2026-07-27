import type { Metadata } from "next";
import { MarketingTopicPage } from "../../components/MarketingTopicPage";
import { getMarketingPage } from "../../lib/marketing-pages";

export const metadata: Metadata = {
  title: "Browser Testing",
  description: "Autonomous browser testing for navigation, forms, checkout, runtime errors, links, and mobile states."
};

export default function BrowserTestingPage() {
  return <MarketingTopicPage page={getMarketingPage("browser-testing")!} />;
}
