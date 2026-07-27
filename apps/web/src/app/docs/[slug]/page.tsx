import type { Metadata } from "next";
import { ContentDetailPage } from "../../../components/ContentPages";
import { getContentBySlug, getContentByCollection } from "../../../lib/content";

export function generateStaticParams() {
  return getContentByCollection("docs").map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = getContentBySlug("docs", params.slug);
  return { title: item?.title || "Docs", description: item?.description };
}

export default function DocsArticlePage({ params }: { params: { slug: string } }) {
  return <ContentDetailPage collection="docs" slug={params.slug} />;
}
