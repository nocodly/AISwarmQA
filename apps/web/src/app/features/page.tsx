import type { Metadata } from "next";
import { MarketingTopicPage } from "../../components/MarketingTopicPage";
import { getMarketingPage } from "../../lib/marketing-pages";

export const metadata: Metadata = {
  title: "Features",
  description: "Autonomous browser agents, evidence capture, GitHub Issue export, duplicate prevention, workspaces, and audit history."
};

export default function FeaturesPage() {
  return <MarketingTopicPage page={getMarketingPage("features")!} />;
}
