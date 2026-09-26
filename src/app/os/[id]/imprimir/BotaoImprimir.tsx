"use client";

export function BotaoImprimir() {
  return (
    <button type="button" className="btn-primario" onClick={() => window.print()}>
      Imprimir
    </button>
  );
}
