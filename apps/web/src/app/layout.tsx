import type { Metadata } from "next";
import "./globals.css";

const baseUrl = process.env.APP_URL || "https://ai-swarm-qaweb-production.up.railway.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "AISwarmQA - Autonomous AI QA agents",
    template: "%s | AISwarmQA"
  },
  description: "Autonomous AI QA agents that find real bugs before your users do.",
  openGraph: {
    title: "AISwarmQA - Autonomous AI QA agents",
    description: "Autonomous browser exploration, normalized findings, captured evidence, and ready-to-fix GitHub Issues.",
    type: "website",
    url: baseUrl
  },
  twitter: {
    card: "summary_large_image",
    title: "AISwarmQA - Autonomous AI QA agents",
    description: "Find real bugs before your users do."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
