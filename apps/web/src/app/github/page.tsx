import type { Metadata } from "next";
import { MarketingTopicPage } from "../../components/MarketingTopicPage";
import { getMarketingPage } from "../../lib/marketing-pages";

export const metadata: Metadata = {
  title: "GitHub Issue Export",
  description: "Convert confirmed AISwarmQA findings into ready-to-fix GitHub Issues with evidence and duplicate prevention."
};

export default function GitHubPage() {
  return <MarketingTopicPage page={getMarketingPage("github")!} />;
}
