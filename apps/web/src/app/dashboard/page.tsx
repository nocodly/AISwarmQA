const metrics = [
  { label: "Audits queued", value: "0" },
  { label: "Findings found", value: "0" },
  { label: "Worker capacity", value: "2" }
];

export default function DashboardPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1>Operational overview</h1>
        </div>
      </header>
      <section className="grid">
        {metrics.map((metric) => (
          <article className="card" key={metric.label}>
            <div className="metric">{metric.value}</div>
            <p>{metric.label}</p>
          </article>
        ))}
      </section>
    </>
  );
}

