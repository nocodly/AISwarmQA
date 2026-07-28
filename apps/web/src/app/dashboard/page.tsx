import { Suspense } from "react";
import { AppShell } from "../../components/AppShell";
import { DashboardClient } from "./DashboardClient";

export default function DashboardPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <DashboardClient />
      </Suspense>
    </AppShell>
  );
}
