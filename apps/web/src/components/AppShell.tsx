import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { BrandIcon } from "./BrandIcons";

const appNav = [
  { group: "Main", href: "/dashboard", label: "Dashboard", icon: "browser", tone: "purple" },
  { group: "Main", href: "/projects", label: "Projects", icon: "evidence", tone: "cyan" },
  { group: "Main", href: "/audits", label: "Audits", icon: "agent", tone: "lime" },
  { group: "Main", href: "/findings", label: "Findings", icon: "bug", tone: "magenta" },
  { group: "Main", href: "/evidence", label: "Evidence", icon: "screenshot", tone: "cyan" },
  { group: "Main", href: "/github", label: "GitHub", icon: "github", tone: "lime" },
  { group: "Main", href: "/agents", label: "Agents", icon: "interaction", tone: "cyan" },
  { group: "Main", href: "/reports", label: "Reports", icon: "complete", tone: "orange" },
  { group: "Account", href: "/billing", label: "Billing", icon: "complete", tone: "orange" },
  { group: "Account", href: "/settings", label: "Settings", icon: "interaction", tone: "cyan" }
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
          {["Main", "Manage", "Account"].filter((group) => appNav.some((item) => item.group === group)).map((group) => (
            <div className="app-nav-group" key={group}>
              <span>{group}</span>
              {appNav.filter((item) => item.group === group).map((item) => (
                <Link href={item.href as Route} key={`${item.href}-${item.label}`}>
                  <BrandIcon name={item.icon} tone={item.tone} />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-audit-cta">
          <BrandIcon name="agent" tone="lime" />
          <strong>Start your next audit</strong>
          <p>Let the swarm find bugs before your users do.</p>
          <Link href="/dashboard?newAudit=1">+ New Audit</Link>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
