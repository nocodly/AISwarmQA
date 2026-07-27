import type { Metadata } from "next";
import { ContentDetailPage } from "../../../components/ContentPages";
import { getContentBySlug, getContentByCollection } from "../../../lib/content";

export function generateStaticParams() {
  return getContentByCollection("glossary").map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = getContentBySlug("glossary", params.slug);
  return { title: item?.title || "Glossary", description: item?.description };
}

export default function GlossaryArticlePage({ params }: { params: { slug: string } }) {
  return <ContentDetailPage collection="glossary" slug={params.slug} />;
}
