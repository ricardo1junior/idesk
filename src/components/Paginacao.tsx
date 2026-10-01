import Link from "next/link";
import { hrefPagina, type faixaDaPagina } from "@/lib/paginacao";

// "Mostrando X–Y de N" com Anterior/Próxima, mantendo os filtros da URL.
export function Paginacao({ faixa, base, filtros }: { faixa: ReturnType<typeof faixaDaPagina>; base: string; filtros: Record<string, string | undefined> }) {
  if (faixa.total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
      <span>
        Mostrando {faixa.de}–{faixa.ate} de {faixa.total}
      </span>
      {(faixa.anterior || faixa.proxima) && (
        <div className="flex gap-2">
          {faixa.anterior && (
            <Link href={hrefPagina(base, filtros, faixa.atual - 1)} className="btn-secundario">
              ← Anterior
            </Link>
          )}
          {faixa.proxima && (
            <Link href={hrefPagina(base, filtros, faixa.atual + 1)} className="btn-secundario">
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
