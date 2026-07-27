import type { Metadata } from "next";
import { ContentIndexPage } from "../../components/ContentPages";

export const metadata: Metadata = {
  title: "Glossary",
  description: "Definitions for AISwarmQA, autonomous QA agents, audits, findings, evidence, GitHub exports, and workspaces."
};

export default function GlossaryPage() {
  return <ContentIndexPage collection="glossary" />;
}
