import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

const appNav = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/billing", label: "Billing" },
  { href: "/projects", label: "Projects" },
  { href: "/projects/new", label: "New Audit" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/settings", label: "Settings" },
  { href: "/audits/demo", label: "Audit Report" }
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="app-brand" href="/">
          <span className="brand-mark">AI</span>
          <span>SwarmQA</span>
        </Link>
        <nav className="app-nav" aria-label="Application">
          {appNav.map((item) => (
            <Link href={item.href as Route} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
