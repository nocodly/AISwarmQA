import { GitHubAppClient } from "../../components/AppDataPages";
import { AppShell } from "../../components/AppShell";

export default function GitHubPage() {
  return (
    <AppShell>
      <GitHubAppClient />
    </AppShell>
  );
}
