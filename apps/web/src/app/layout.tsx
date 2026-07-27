import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Swarm QA",
  description: "AI QA Team for every deployment."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand">AI Swarm QA</div>
            <nav className="nav" aria-label="Primary">
              <Link href="/">Overview</Link>
              <Link href="/dashboard">Dashboard</Link>
              <a href="/billing">Billing</a>
              <Link href="/projects">Projects</Link>
              <Link href="/projects/new">New Audit</Link>
              <a href="/onboarding">Onboarding</a>
              <a href="/settings">Settings</a>
              <Link href="/audits/demo">Audit Report</Link>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
