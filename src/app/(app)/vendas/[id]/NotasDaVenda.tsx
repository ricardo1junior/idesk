"use client";

import { useState, useTransition } from "react";
import { atualizarNota, cancelarNota, emitirNota } from "../../notas/emissao";

type Nota = {
  id: string;
  modelo: "NFE" | "NFCE";
  status: "PROCESSANDO" | "AUTORIZADA" | "REJEITADA" | "CANCELADA" | "ERRO";
  numero: string | null;
  serie: string | null;
  chave: string | null;
  mensagem: string | null;
  danfe: string | null;
  xml: string | null;
  homologacao: boolean;
  criadoEm: string;
};

const COR = {
  PROCESSANDO: "bg-amber-100 text-amber-800",
  AUTORIZADA: "bg-green-100 text-green-800",
  REJEITADA: "bg-red-100 text-red-800",
  CANCELADA: "bg-zinc-200 text-zinc-700",
  ERRO: "bg-red-100 text-red-800",
};
const NOME = { PROCESSANDO: "Processando", AUTORIZADA: "Autorizada", REJEITADA: "Rejeitada", CANCELADA: "Cancelada", ERRO: "Não enviada" };

export function NotasDaVenda({
  vendaId,
  notas,
  podeEmitir,
  podeCancelar,
  sugerido,
}: {
  vendaId: string;
  notas: Nota[];
  podeEmitir: boolean;
  podeCancelar: boolean;
  sugerido: "NFE" | "NFCE";
}) {
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const ativa = notas.some((n) => n.status === "AUTORIZADA" || n.status === "PROCESSANDO");
  const rodar = (f: () => Promise<{ erro?: string }>) => {
    setErro(undefined);
    iniciar(async () => {
      const r = await f();
      if (r.erro) setErro(r.erro);
    });
  };

  return (
    <div className="space-y-3">
      {notas.length === 0 && <p className="text-sm text-zinc-500">Nenhuma nota emitida para esta venda.</p>}
      {notas.map((n) => (
        <div key={n.id} className="rounded-md border border-zinc-200 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <b>{n.modelo === "NFCE" ? "NFC-e" : "NF-e"}</b>
            {n.numero && (
              <span>
                nº {n.numero} série {n.serie}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR[n.status]}`}>{NOME[n.status]}</span>
            {n.homologacao && <span className="text-xs text-amber-700">homologação (sem valor fiscal)</span>}
            <span className="ml-auto text-xs text-zinc-500">{new Date(n.criadoEm).toLocaleString("pt-BR")}</span>
          </div>
          {n.chave && <div className="mt-1 break-all font-mono text-xs text-zinc-500">{n.chave}</div>}
          {n.mensagem && <div className="mt-1 text-zinc-600">{n.mensagem}</div>}
          <div className="mt-2 flex flex-wrap gap-2">
            {n.danfe && (
              <a href={n.danfe} target="_blank" rel="noreferrer" className="btn-secundario">
                {n.modelo === "NFCE" ? "Cupom (DANFE NFC-e)" : "DANFE (PDF)"}
              </a>
            )}
            {n.xml && (
              <a href={n.xml} target="_blank" rel="noreferrer" className="btn-secundario">
                XML
              </a>
            )}
            {n.status === "PROCESSANDO" && (
              <button type="button" className="btn-secundario" disabled={pendente} onClick={() => rodar(() => atualizarNota(n.id))}>
                Atualizar situação
              </button>
            )}
            {n.status === "AUTORIZADA" && podeCancelar && (
              <button
                type="button"
                className="btn-secundario text-red-700"
                disabled={pendente}
                onClick={() => {
                  const j = prompt("Motivo do cancelamento (mínimo 15 caracteres):");
                  if (j) rodar(() => cancelarNota(n.id, j));
                }}
              >
                Cancelar nota
              </button>
            )}
          </div>
        </div>
      ))}
      {podeEmitir && !ativa && (
        <div className="flex flex-wrap gap-2">
          {(["NFCE", "NFE"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={m === sugerido ? "btn-primario" : "btn-secundario"}
              disabled={pendente}
              onClick={() => rodar(() => emitirNota(vendaId, m))}
            >
              {pendente ? "Enviando…" : m === "NFCE" ? "Emitir NFC-e (consumidor)" : "Emitir NF-e"}
            </button>
          ))}
        </div>
      )}
      {erro && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>}
    </div>
  );
}
