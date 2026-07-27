import type { Metadata } from "next";
import { MarketingTopicPage } from "../../components/MarketingTopicPage";
import { getMarketingPage } from "../../lib/marketing-pages";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Enter a URL, let autonomous QA agents explore, review findings, capture evidence, and export confirmed GitHub Issues."
};

export default function HowItWorksPage() {
  return <MarketingTopicPage page={getMarketingPage("how-it-works")!} />;
}
