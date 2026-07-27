import type { Metadata } from "next";
import { ContentIndexPage } from "../../components/ContentPages";

export const metadata: Metadata = {
  title: "Docs",
  description: "AISwarmQA documentation for audits, GitHub export, evidence, workspaces, and production QA workflows."
};

export default function DocsPage() {
  return <ContentIndexPage collection="docs" />;
}
