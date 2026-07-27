import { AuditForm } from "../../AuditForm";
import { AppShell } from "../../../components/AppShell";

export default function NewAuditPage() {
  return (
    <AppShell>
      <header className="page-header">
        <div>
          <div className="eyebrow">Start Audit</div>
          <h1>Brief your QA swarm.</h1>
          <p>Choose the target, access mode, scope, and safety rules before agents inspect the product.</p>
        </div>
      </header>
      <AuditForm />
    </AppShell>
  );
}
