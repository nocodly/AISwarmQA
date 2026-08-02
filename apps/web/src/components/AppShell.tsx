import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { LinearIcon } from "./BrandIcons";

const appNav = [
  { group: "Main", href: "/dashboard", label: "Dashboard", icon: "views" },
  { group: "Main", href: "/audits", label: "Audits", icon: "projects" },
  { group: "Main", href: "/findings", label: "Findings", icon: "issues" },
  { group: "Main", href: "/github", label: "GitHub", icon: "github" },
  { group: "Account", href: "/settings", label: "Settings", icon: "inbox" }
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="app-brand" href="/dashboard">
          <span>
            <strong>Swarm</strong>QA
          </span>
        </Link>
        <nav className="app-nav" aria-label="Application">
          {["Main", "Account"].filter((group) => appNav.some((item) => item.group === group)).map((group) => (
            <div className="app-nav-group" key={group}>
              <span>{group}</span>
              {appNav.filter((item) => item.group === group).map((item) => (
                <Link href={item.href as Route} key={`${item.href}-${item.label}`}>
                  <LinearIcon name={item.icon} />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
