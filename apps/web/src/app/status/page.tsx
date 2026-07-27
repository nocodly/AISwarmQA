import type { Metadata } from "next";
import { MarketingTopicPage } from "../../components/MarketingTopicPage";
import { getMarketingPage } from "../../lib/marketing-pages";

export const metadata: Metadata = {
  title: "Status",
  description: "AISwarmQA status preview for app health, database health, worker health, and operational checks."
};

export default function StatusPage() {
  return <MarketingTopicPage page={getMarketingPage("status")!} />;
}
