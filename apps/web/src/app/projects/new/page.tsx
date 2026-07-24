import { AuditForm } from "../../AuditForm";

export default function NewAuditPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">New Audit</div>
          <h1>Create an audit request</h1>
          <p>Authorization is required before the system queues browser workers.</p>
        </div>
      </header>
      <AuditForm />
    </>
  );
}
