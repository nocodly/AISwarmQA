import type { Metadata } from "next";
import { ContentDetailPage } from "../../../components/ContentPages";
import { getContentBySlug, getContentByCollection } from "../../../lib/content";

export function generateStaticParams() {
  return getContentByCollection("use-cases").map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = getContentBySlug("use-cases", params.slug);
  return { title: item?.title || "Use Cases", description: item?.description };
}

export default function UseCaseDetailPage({ params }: { params: { slug: string } }) {
  return <ContentDetailPage collection="use-cases" slug={params.slug} />;
}
