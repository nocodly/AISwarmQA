import type { Metadata } from "next";
import { ContentDetailPage } from "../../../components/ContentPages";
import { getContentBySlug, getContentByCollection } from "../../../lib/content";

export function generateStaticParams() {
  return getContentByCollection("compare").map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = getContentBySlug("compare", params.slug);
  return { title: item?.title || "Compare", description: item?.description };
}

export default function CompareDetailPage({ params }: { params: { slug: string } }) {
  return <ContentDetailPage collection="compare" slug={params.slug} />;
}
