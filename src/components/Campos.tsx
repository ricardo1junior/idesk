export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">{titulo}</h2>
      <div className="grid gap-4 sm:grid-cols-4">{children}</div>
    </section>
  );
}

export function Campo({
  label,
  erro,
  dica,
  className = "",
  children,
}: {
  label: string;
  erro?: string;
  dica?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`campo ${erro ? "campo-erro" : ""} ${className}`}>
      <span>{label}</span>
      {children}
      {erro ? <small className="text-red-600">{erro}</small> : dica && <small className="text-zinc-500">{dica}</small>}
    </label>
  );
}
