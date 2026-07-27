import type { Metadata } from "next";
import { ContentIndexPage } from "../../components/ContentPages";

export const metadata: Metadata = {
  title: "Compare",
  description: "Compare AISwarmQA with manual QA and other product-quality workflows."
};

export default function ComparePage() {
  return <ContentIndexPage collection="compare" />;
}
