import type { Metadata } from "next";
import { MarketingTopicPage } from "../../components/MarketingTopicPage";
import { getMarketingPage } from "../../lib/marketing-pages";

export const metadata: Metadata = {
  title: "About",
  description: "AISwarmQA is built for developers, founders, QA engineers, agencies, and SaaS teams that ship fast."
};

export default function AboutPage() {
  return <MarketingTopicPage page={getMarketingPage("about")!} />;
}
