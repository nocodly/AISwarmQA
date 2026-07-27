import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { BrandIcon } from "./BrandIcons";

const appNav = [
  { href: "/", label: "Home", icon: "browser", tone: "cyan" },
  { href: "/dashboard", label: "Dashboard", icon: "agent", tone: "lime" },
  { href: "/projects/new", label: "Start Audit", icon: "bug", tone: "orange" },
  { href: "/projects", label: "Audit Hub", icon: "browser", tone: "purple" },
  { href: "/settings", label: "Workspace", icon: "private", tone: "lime" },
  { href: "/billing", label: "Plan & Usage", icon: "complete", tone: "magenta" },
  { href: "/onboarding", label: "Onboarding", icon: "interaction", tone: "cyan" },
  { href: "/docs", label: "Docs", icon: "evidence", tone: "cyan" }
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
