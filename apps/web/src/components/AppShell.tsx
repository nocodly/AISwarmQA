import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { BrandIcon } from "./BrandIcons";

const appNav = [
  { href: "/dashboard", label: "Dashboard", icon: "browser", tone: "purple" },
  { href: "/dashboard#audits", label: "Audits", icon: "agent", tone: "lime" },
  { href: "/dashboard#findings", label: "Findings", icon: "bug", tone: "magenta" },
  { href: "/dashboard#github", label: "GitHub", icon: "github", tone: "cyan" },
  { href: "/settings", label: "Team", icon: "private", tone: "lime" },
  { href: "/billing", label: "Billing", icon: "complete", tone: "orange" },
  { href: "/settings", label: "Settings", icon: "interaction", tone: "cyan" }
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="app-brand" href="/dashboard">
          <span className="brand-mark">AI</span>
          <span>
            <strong>Swarm</strong>QA
          </span>
        </Link>
        <nav className="app-nav" aria-label="Application">
          {appNav.map((item) => (
            <Link href={item.href as Route} key={`${item.href}-${item.label}`}>
              <BrandIcon name={item.icon} tone={item.tone} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
