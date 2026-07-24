import { AuditDetails } from "./AuditDetails";

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">Audit {id}</div>
          <h1>Audit status</h1>
          <p>Live lifecycle state and deterministic findings from the worker.</p>
        </div>
      </header>
      <AuditDetails auditId={id} />
    </>
  );
}
