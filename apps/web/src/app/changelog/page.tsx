import type { Metadata } from "next";
import { ContentIndexPage } from "../../components/ContentPages";

export const metadata: Metadata = {
  title: "Changelog",
  description: "AISwarmQA product updates, preview releases, and platform changes."
};

export default function ChangelogPage() {
  return <ContentIndexPage collection="changelog" />;
}
