import { AuditForm } from "../../AuditForm";
import { AppShell } from "../../../components/AppShell";

export default function NewAuditPage() {
  return (
    <AppShell>
      <header className="page-header">
        <div>
          <div className="eyebrow">New Audit</div>
          <h1>Create an audit request</h1>
          <p>Authorization is required before the system queues browser workers.</p>
        </div>
      </header>
      <AuditForm />
    </AppShell>
  );
}
