import type { Metadata } from "next";
import { MarketingTopicPage } from "../../components/MarketingTopicPage";
import { getMarketingPage } from "../../lib/marketing-pages";

export const metadata: Metadata = {
  title: "Pricing",
  description: "AISwarmQA pricing: Free $0, Pro $79/month, Pro $790/year, and Business custom plans."
};

export default function PricingPage() {
  return <MarketingTopicPage page={getMarketingPage("pricing")!} />;
}
