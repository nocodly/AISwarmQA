import { appUrl } from "../../components/MarketingShell";
import { getPublishedContent } from "../../lib/content";

export function GET() {
  const items = getPublishedContent().filter((item) => item.collection === "blog" || item.collection === "changelog");
  const body = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>AISwarmQA</title>
    <link>${appUrl("/")}</link>
    <description>Autonomous AI QA agents, browser testing, and GitHub-ready bug reports.</description>
    ${items
      .map(
        (item) => `<item>
      <title>${escapeXml(item.title)}</title>
      <link>${appUrl(`/${item.collection}/${item.slug}`)}</link>
      <guid>${appUrl(`/${item.collection}/${item.slug}`)}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${new Date(item.publishedAt || item.updatedAt).toUTCString()}</pubDate>
    </item>`
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    if (character === "<") return "&lt;";
    if (character === ">") return "&gt;";
    if (character === "&") return "&amp;";
    if (character === "'") return "&apos;";
    return "&quot;";
  });
}
