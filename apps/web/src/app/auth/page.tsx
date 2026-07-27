import { MarketingShell } from "@/components/MarketingShell";
import { AuthClient } from "./AuthClient";

export const metadata = {
  title: "Sign in or create account | AI SwarmQA",
  description: "Create an AI SwarmQA account or sign in to your workspace."
};

export default function AuthPage() {
  return (
    <MarketingShell>
      <AuthClient />
    </MarketingShell>
  );
}
