import type { Metadata } from "next";
import { ContentDetailPage } from "../../../components/ContentPages";
import { getContentBySlug, getContentByCollection } from "../../../lib/content";

export function generateStaticParams() {
  return getContentByCollection("integrations").map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = getContentBySlug("integrations", params.slug);
  return { title: item?.title || "Integrations", description: item?.description };
}

export default function IntegrationDetailPage({ params }: { params: { slug: string } }) {
  return <ContentDetailPage collection="integrations" slug={params.slug} />;
}
