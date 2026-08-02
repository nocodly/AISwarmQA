import { AuditForm } from "../../AuditForm";
import { AppShell } from "../../../components/AppShell";

export default function NewAuditPage() {
  return (
    <AppShell>
      <header className="page-header app-page-header">
        <div>
          <div className="eyebrow">Start Audit</div>
          <h1>New audit.</h1>
          <p>Enter the target, choose access, confirm safety, and launch.</p>
        </div>
      </header>
      <AuditForm />
    </AppShell>
  );
}
