"use client";

import { useEffect, useState } from "react";
import { avaliarTroca } from "@/app/(app)/vendas/actions";
import { linksDePesquisa, type ResumoPrecos } from "@/lib/avaliacao-troca";
import { formatarReais } from "@/lib/vendas";

type Resultado = { pagoEmTrocas: ResumoPrecos; vendidoSeminovo: ResumoPrecos };

function Linha({ titulo, r }: { titulo: string; r: ResumoPrecos }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{titulo}</div>
      {r ? (
        <div>
          <span className="text-base font-semibold">{formatarReais(r.media)}</span>{" "}
          <span className="text-xs text-zinc-500">
            média de {r.quantidade} {r.quantidade === 1 ? "aparelho" : "aparelhos"}
            {r.quantidade > 1 && ` (${formatarReais(r.minimo)} a ${formatarReais(r.maximo)})`}
          </span>
        </div>
      ) : (
        <div className="text-zinc-400">Sem histórico ainda</div>
      )}
    </div>
  );
}

/** Referências de preço para fechar a troca: histórico da loja e pesquisa nos sites de anúncios. */
export function AvaliacaoTroca({ modelo, capacidade }: { modelo: string; capacidade: string }) {
  const [resultado, setResultado] = useState<{ chave: string; dados: Resultado }>();
  const chave = `${modelo.trim()}|${capacidade.trim()}`;

  useEffect(() => {
    if (modelo.trim().length < 3) return;
    let ativo = true;
    const t = setTimeout(async () => {
      const dados = await avaliarTroca(modelo, capacidade);
      if (ativo) setResultado({ chave, dados });
    }, 400);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [chave, modelo, capacidade]);

  if (modelo.trim().length < 3) return null;
  const dados = resultado?.chave === chave ? resultado.dados : undefined;

  return (
    <div className="rounded-md bg-zinc-100 p-3 text-sm sm:col-span-4">
      <div className="mb-2 font-medium">Referência de preço</div>
      {dados ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Linha titulo="A loja pagou em trocas" r={dados.pagoEmTrocas} />
          <Linha titulo="A loja vendeu seminovo por" r={dados.vendidoSeminovo} />
        </div>
      ) : (
        <div className="text-zinc-500">Buscando histórico...</div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs text-zinc-500">Preço de mercado (usados):</span>
        {linksDePesquisa(modelo, capacidade).map((l) => (
          <a key={l.site} href={l.url} target="_blank" rel="noreferrer" className="text-xs text-link hover:underline">
            {l.site} ↗
          </a>
        ))}
      </div>
    </div>
  );
}
