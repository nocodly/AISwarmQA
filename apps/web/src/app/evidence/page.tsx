import type { Metadata } from "next";
import { MarketingTopicPage } from "../../components/MarketingTopicPage";
import { getMarketingPage } from "../../lib/marketing-pages";

export const metadata: Metadata = {
  title: "Evidence",
  description: "Stable evidence routes, private storage, revocation, workspace authorization, and retention policies for QA findings."
};

export default function EvidencePage() {
  return <MarketingTopicPage page={getMarketingPage("evidence")!} />;
}
