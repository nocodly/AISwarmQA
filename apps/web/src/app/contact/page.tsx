import type { Metadata } from "next";
import { MarketingTopicPage } from "../../components/MarketingTopicPage";
import { getMarketingPage } from "../../lib/marketing-pages";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact AISwarmQA about autonomous QA audits, GitHub workflows, production QA, or Business plan requirements."
};

export default function ContactPage() {
  return <MarketingTopicPage page={getMarketingPage("contact")!} />;
}
