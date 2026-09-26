"use client";

// Grade 3x3 para registrar a senha de padrão (desenho) como sequência de pontos 1 a 9.
export function PadraoSenha({ valor, onChange, somenteLeitura }: { valor: string; onChange?: (v: string) => void; somenteLeitura?: boolean }) {
  const pontos = valor.split("").map(Number);
  const pos = (n: number) => ({ x: ((n - 1) % 3) * 60 + 30, y: Math.floor((n - 1) / 3) * 60 + 30 });

  return (
    <div className="flex items-start gap-4">
      <svg viewBox="0 0 180 180" className="h-40 w-40 touch-none rounded-md border border-zinc-300 bg-white">
        {pontos.slice(1).map((p, i) => {
          const a = pos(pontos[i]);
          const b = pos(p);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#18181b" strokeWidth={4} strokeLinecap="round" />;
        })}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const { x, y } = pos(n);
          const ordem = pontos.indexOf(n);
          return (
            <g
              key={n}
              onClick={() => !somenteLeitura && ordem === -1 && onChange?.(valor + n)}
              className={somenteLeitura ? "" : "cursor-pointer"}
            >
              <circle cx={x} cy={y} r={22} fill="transparent" />
              <circle cx={x} cy={y} r={ordem === -1 ? 8 : 12} fill={ordem === -1 ? "#d4d4d8" : "#18181b"} />
              {ordem !== -1 && (
                <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fill="white">
                  {ordem + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {!somenteLeitura && (
        <div className="space-y-2 text-sm">
          <p className="text-zinc-600">Toque nos pontos na ordem do desenho.</p>
          <p className="font-mono">{valor || "-"}</p>
          <button type="button" className="btn-secundario" onClick={() => onChange?.("")}>
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}
