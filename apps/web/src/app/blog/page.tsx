import type { Metadata } from "next";
import { ContentIndexPage } from "../../components/ContentPages";

export const metadata: Metadata = {
  title: "Blog",
  description: "AISwarmQA essays and practical guides for autonomous QA, browser testing, GitHub workflows, and web quality."
};

export default function BlogPage() {
  return <ContentIndexPage collection="blog" />;
}
