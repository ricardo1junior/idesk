"use client";

import { useActionState, useState, useTransition } from "react";
import { formatarReais } from "@/lib/vendas";
import { novaRecarga, verificarRecarga, type EstadoRecarga } from "./actions";

const FORMAS = { PIX: "Pix", BOLETO: "Boleto", CARTAO: "Cartão de crédito" } as const;

export function FormRecarga({ diaria, minimo, disponivel }: { diaria: number; minimo: number; disponivel: boolean }) {
  const [estado, acao, pendente] = useActionState<EstadoRecarga, FormData>(novaRecarga, {});
  const pacotes = [30, 90, 180].map((dias) => ({ dias, valor: Math.max(minimo, Math.round(dias * diaria * 100) / 100) }));
  const [valor, setValor] = useState(pacotes[0].valor.toFixed(2).replace(".", ","));
  const [forma, setForma] = useState<keyof typeof FORMAS>("PIX");

  return (
    <form action={acao} className="space-y-4 rounded-lg border border-zinc-200 bg-cartao p-5">
      <h2 className="titulo-secao mb-0">Recarregar créditos</h2>
      {!disponivel && <p className="text-sm text-amber-700">A recarga online ainda não foi ativada pelo suporte do sistema.</p>}
      <div className="flex flex-wrap gap-2">
        {pacotes.map((p) => (
          <button
            key={p.dias}
            type="button"
            onClick={() => setValor(p.valor.toFixed(2).replace(".", ","))}
            className={`rounded-lg border px-4 py-2 text-left text-sm ${valor === p.valor.toFixed(2).replace(".", ",") ? "border-azul ring-2 ring-azul/30" : "border-zinc-300"}`}
          >
            <div className="font-medium">{p.dias} dias</div>
            <div className="text-zinc-500">{formatarReais(p.valor)}</div>
          </button>
        ))}
      </div>
      <div className="grid items-end gap-3 sm:grid-cols-[10rem_1fr_auto]">
        <label className="campo">
          <span>Valor (R$)</span>
          <input name="valor" value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" />
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FORMAS) as (keyof typeof FORMAS)[]).map((f) => (
            <label key={f} className="chip">
              <input type="radio" name="forma" value={f} checked={forma === f} onChange={() => setForma(f)} className="sr-only" />
              <span>{FORMAS[f]}</span>
            </label>
          ))}
        </div>
        <button className="btn-primario" disabled={pendente || !disponivel}>
          {pendente ? "Gerando..." : "Gerar cobrança"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">Mínimo de {formatarReais(minimo)}. Cartão e boleto abrem a página segura de pagamento do Asaas.</p>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado.ok && <p className="text-sm text-green-700">{estado.ok}</p>}
    </form>
  );
}

type Pendente = { id: string; valor: number; forma: keyof typeof FORMAS; link: string | null; pixCopiaCola: string | null; pixQrCode: string | null; vencimento: string };

export function RecargaPendente({ recarga: r }: { recarga: Pendente }) {
  const [pendente, iniciar] = useTransition();
  const [estado, setEstado] = useState<EstadoRecarga>({});
  const [copiado, setCopiado] = useState(false);

  return (
    <section className="flex flex-wrap items-start gap-5 rounded-lg border border-amber-200 bg-amber-50 p-5">
      {r.pixQrCode && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/png;base64,${r.pixQrCode}`} alt="QR Code Pix" className="size-40 rounded-md bg-white p-2" />
      )}
      <div className="min-w-0 flex-1 space-y-2 text-sm">
        <div className="font-medium">
          Recarga de {formatarReais(r.valor)} por {FORMAS[r.forma].toLowerCase()} aguardando pagamento
        </div>
        <div className="text-zinc-600">Vence em {r.vencimento}.</div>
        {r.pixCopiaCola && (
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded bg-cartao px-2 py-1 text-xs">{r.pixCopiaCola}</code>
            <button
              type="button"
              className="btn-secundario"
              onClick={() => {
                navigator.clipboard?.writeText(r.pixCopiaCola!);
                setCopiado(true);
              }}
            >
              {copiado ? "Copiado" : "Copiar Pix"}
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {r.link && (
            <a href={r.link} target="_blank" rel="noreferrer" className="btn-primario">
              {r.forma === "BOLETO" ? "Abrir boleto" : r.forma === "CARTAO" ? "Pagar com cartão" : "Abrir cobrança"}
            </a>
          )}
          <button type="button" className="btn-secundario" disabled={pendente} onClick={() => iniciar(async () => setEstado(await verificarRecarga(r.id)))}>
            {pendente ? "Verificando..." : "Já paguei"}
          </button>
        </div>
        {estado.erro && <p className="text-red-600">{estado.erro}</p>}
        {estado.ok && <p className="text-green-700">{estado.ok}</p>}
      </div>
    </section>
  );
}
