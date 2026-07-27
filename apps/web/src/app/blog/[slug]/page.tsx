import type { Metadata } from "next";
import { ContentDetailPage } from "../../../components/ContentPages";
import { getContentBySlug, getContentByCollection } from "../../../lib/content";

export function generateStaticParams() {
  return getContentByCollection("blog").map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = getContentBySlug("blog", params.slug);
  return { title: item?.title || "Blog", description: item?.description };
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  return <ContentDetailPage collection="blog" slug={params.slug} />;
}
