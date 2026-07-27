import type { Metadata } from "next";
import { ContentDetailPage } from "../../../components/ContentPages";
import { getContentBySlug, getContentByCollection } from "../../../lib/content";

export function generateStaticParams() {
  return getContentByCollection("changelog").map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = getContentBySlug("changelog", params.slug);
  return { title: item?.title || "Changelog", description: item?.description };
}

export default function ChangelogDetailPage({ params }: { params: { slug: string } }) {
  return <ContentDetailPage collection="changelog" slug={params.slug} />;
}
