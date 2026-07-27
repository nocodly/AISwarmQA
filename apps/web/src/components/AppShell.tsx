import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { BrandIcon } from "./BrandIcons";

const appNav = [
  { href: "/", label: "Home", icon: "browser", tone: "cyan" },
  { href: "/dashboard", label: "Dashboard", icon: "agent", tone: "lime" },
  { href: "/billing", label: "Billing", icon: "complete", tone: "magenta" },
  { href: "/projects", label: "Projects", icon: "browser", tone: "purple" },
  { href: "/projects/new", label: "New Audit", icon: "bug", tone: "orange" },
  { href: "/onboarding", label: "Onboarding", icon: "interaction", tone: "cyan" },
  { href: "/settings", label: "Settings", icon: "private", tone: "lime" },
  { href: "/audits/demo", label: "Audit Report", icon: "evidence", tone: "magenta" }
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="app-brand" href="/">
          <span className="brand-mark">AI</span>
          <span>
            <strong>Swarm</strong>QA
          </span>
        </Link>
        <nav className="app-nav" aria-label="Application">
          {appNav.map((item) => (
            <Link href={item.href as Route} key={item.href}>
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
