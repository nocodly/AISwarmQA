import type { Metadata } from "next";
import { ContentIndexPage } from "../../components/ContentPages";

export const metadata: Metadata = {
  title: "Integrations",
  description: "AISwarmQA integrations for GitHub Issues and developer QA workflows."
};

export default function IntegrationsPage() {
  return <ContentIndexPage collection="integrations" />;
}
