import type { Metadata } from "next";
import { ContentIndexPage } from "../../components/ContentPages";

export const metadata: Metadata = {
  title: "Use Cases",
  description: "AISwarmQA use cases for SaaS teams, startups, agencies, developers, and release owners."
};

export default function UseCasesPage() {
  return <ContentIndexPage collection="use-cases" />;
}
