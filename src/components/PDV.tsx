"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { buscarParaVenda, finalizarVenda, type OpcaoVenda } from "@/app/(app)/vendas/actions";
import { formatarDocumento } from "@/lib/documentos";
import { CONDICOES, paraNumero } from "@/lib/estoque";
import { calcularTotais, centavos, FORMAS_PAGAMENTO, formatarReais, somaPagamentos, totalItem } from "@/lib/vendas";
import { COM_VENCIMENTO } from "@/lib/financeiro";
import { BuscaCliente } from "./OSForm";
import { VerificarImei } from "./VerificarImei";

type Cliente = { id: string; nome: string; documento: string };
type Item = OpcaoVenda & { quantidade: number; valorUnit: string; desconto: string };
type Troca = {
  modelo: string;
  capacidade: string;
  cor: string;
  imei: string;
  serial: string;
  condicao: "SEMINOVO_A" | "SEMINOVO_B" | "SEMINOVO_C";
  saudeBateria: string;
  icloudDesativado: boolean;
  procedenciaDeclarada: boolean;
  observacoes: string;
};
type Pagamento = { id: number; forma: keyof typeof FORMAS_PAGAMENTO; valor: string; parcelas: number; primeiroVencimento: string; troca: Troca | null };

const trocaVazia = (): Troca => ({
  modelo: "",
  capacidade: "",
  cor: "",
  imei: "",
  serial: "",
  condicao: "SEMINOVO_B",
  saudeBateria: "",
  icloudDesativado: false,
  procedenciaDeclarada: false,
  observacoes: "",
});

// Aceita desconto em reais ("50" / "50,00") ou em porcentagem ("10%") sobre a base informada.
function valorDesconto(texto: string, base: number): number {
  const t = texto.trim();
  if (t.endsWith("%")) return Math.round(base * paraNumero(t.slice(0, -1))) / 100;
  return paraNumero(t);
}
const reais = (v: number) => v.toFixed(2).replace(".", ",");

export function PDV() {
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente>();
  const [itens, setItens] = useState<Item[]>([]);
  const [descontoGeral, setDescontoGeral] = useState("");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string>();
  const [enviando, iniciar] = useTransition();

  const itensCalc = itens.map((i) => {
    const bruto = paraNumero(i.valorUnit) * i.quantidade;
    return { quantidade: i.quantidade, valorUnit: paraNumero(i.valorUnit), desconto: valorDesconto(i.desconto, bruto) };
  });
  const parcial = calcularTotais(itensCalc, 0);
  const descontoGeralValor = valorDesconto(descontoGeral, parcial.subtotal);
  const { subtotal, total } = calcularTotais(itensCalc, descontoGeralValor);
  const pagCalc = pagamentos.map((p) => ({ valor: paraNumero(p.valor) }));
  const pago = somaPagamentos(pagCalc);
  const falta = (centavos(total) - centavos(pago)) / 100;

  function adicionar(o: OpcaoVenda) {
    setErro(undefined);
    setItens((atual) => {
      if (o.aparelhoId && atual.some((i) => i.aparelhoId === o.aparelhoId)) return atual;
      const igual = !o.aparelhoId && atual.find((i) => i.chave === o.chave);
      if (igual) return atual.map((i) => (i === igual ? { ...i, quantidade: Math.min(i.quantidade + 1, o.disponivel) } : i));
      return [...atual, { ...o, quantidade: 1, valorUnit: reais(o.preco), desconto: "" }];
    });
  }
  function alterarItem(n: number, mudanca: Partial<Item>) {
    setErro(undefined);
    setItens((a) => a.map((i, k) => (k === n ? { ...i, ...mudanca } : i)));
  }
  function alterarPag(id: number, mudanca: Partial<Pagamento>) {
    setErro(undefined);
    setPagamentos((a) => a.map((p) => (p.id === id ? { ...p, ...mudanca } : p)));
  }

  function novoPagamento(forma: Pagamento["forma"]) {
    setPagamentos((a) => [
      ...a,
      { id: Date.now(), forma, valor: forma === "TROCA" ? "" : reais(Math.max(falta, 0)), parcelas: 1, primeiroVencimento: "", troca: forma === "TROCA" ? trocaVazia() : null },
    ]);
  }

  function finalizar() {
    setErro(undefined);
    const payload = {
      clienteId: cliente?.id ?? null,
      itens: itens.map((i, n) => ({
        produtoId: i.produtoId,
        aparelhoId: i.aparelhoId,
        descricao: i.descricao,
        quantidade: i.quantidade,
        valorUnit: itensCalc[n].valorUnit,
        desconto: itensCalc[n].desconto,
      })),
      desconto: descontoGeralValor,
      pagamentos: pagamentos.map((p) => ({
        forma: p.forma,
        valor: paraNumero(p.valor),
        parcelas: p.parcelas,
        primeiroVencimento: COM_VENCIMENTO.includes(p.forma) && p.primeiroVencimento ? p.primeiroVencimento : null,
        troca: p.troca
          ? { ...p.troca, saudeBateria: p.troca.saudeBateria ? Number(p.troca.saudeBateria) : null, imei: p.troca.imei || undefined, serial: p.troca.serial || undefined }
          : null,
      })),
      observacoes,
    };
    iniciar(async () => {
      const r = await finalizarVenda(payload);
      if (r.erro) setErro(r.erro);
      else if (r.id) router.push(`/vendas/${r.id}`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-lg border border-zinc-200 bg-cartao p-5">
          <h2 className="titulo-secao">Itens</h2>
          <BuscaProduto onEscolher={adicionar} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] table-fixed text-sm">
              <thead className="text-left text-zinc-500">
                <tr>
                  <th className="py-2 font-medium">Produto</th>
                  <th className="w-16 py-2 font-medium">Qtd.</th>
                  <th className="w-28 py-2 font-medium">Valor unit.</th>
                  <th className="w-24 py-2 font-medium">Desconto</th>
                  <th className="w-28 py-2 text-right font-medium">Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {itens.map((i, n) => (
                  <tr key={i.chave} className="border-t border-zinc-100 align-top">
                    <td className="py-2 pr-2">
                      <div className="font-medium">{i.descricao}</div>
                      <div className="text-xs text-zinc-500">{i.detalhe}</div>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="campo">
                        <input
                        aria-label="Quantidade"
                        type="number"
                        min={1}
                        max={i.disponivel}
                        value={i.quantidade}
                        disabled={!!i.aparelhoId}
                        onChange={(e) => alterarItem(n, { quantidade: Math.max(1, Math.min(Number(e.target.value) || 1, i.disponivel)) })}
                      />
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="campo">
                        <input aria-label="Valor unitário" inputMode="decimal" value={i.valorUnit} onChange={(e) => alterarItem(n, { valorUnit: e.target.value })} />
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="campo">
                        <input aria-label="Desconto do item" inputMode="decimal" placeholder="R$ ou %" value={i.desconto} onChange={(e) => alterarItem(n, { desconto: e.target.value })} />
                      </div>
                    </td>
                    <td className="py-2 text-right font-medium">{formatarReais(totalItem(itensCalc[n]))}</td>
                    <td className="py-2 text-right">
                      <button type="button" aria-label="Remover" className="text-zinc-400 hover:text-red-600" onClick={() => setItens((a) => a.filter((_, k) => k !== n))}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-zinc-500">
                      Busque um produto ou aparelho para adicionar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-cartao p-5">
          <h2 className="titulo-secao">Pagamento</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(FORMAS_PAGAMENTO).map(([f, label]) => (
              <button key={f} type="button" className="btn-secundario" onClick={() => novoPagamento(f as Pagamento["forma"])}>
                + {label}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            {pagamentos.map((p) => (
              <div key={p.id} className="rounded-md border border-zinc-200 p-3">
                <div className="grid items-end gap-3 sm:grid-cols-[1fr_9rem_7rem_10rem_auto]">
                  <div className="text-sm font-medium">{FORMAS_PAGAMENTO[p.forma]}</div>
                  <label className="campo">
                    <span>{p.forma === "TROCA" ? "Valor avaliado" : "Valor"}</span>
                    <input inputMode="decimal" value={p.valor} onChange={(e) => alterarPag(p.id, { valor: e.target.value })} />
                  </label>
                  {p.forma === "CREDITO" || p.forma === "BOLETO" || p.forma === "A_PRAZO" ? (
                    <label className="campo">
                      <span>Parcelas</span>
                      <select value={p.parcelas} onChange={(e) => alterarPag(p.id, { parcelas: Number(e.target.value) })}>
                        {Array.from({ length: 12 }, (_, k) => k + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}x
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div />
                  )}
                  {COM_VENCIMENTO.includes(p.forma) ? (
                    <label className="campo">
                      <span>1º vencimento</span>
                      <input type="date" value={p.primeiroVencimento} onChange={(e) => alterarPag(p.id, { primeiroVencimento: e.target.value })} />
                    </label>
                  ) : (
                    <div />
                  )}
                  <button type="button" className="pb-2 text-sm text-zinc-500 hover:text-red-600" onClick={() => setPagamentos((a) => a.filter((x) => x.id !== p.id))}>
                    Remover
                  </button>
                </div>
                {p.troca && <FormTroca troca={p.troca} onChange={(t) => alterarPag(p.id, { troca: t })} />}
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <section className="rounded-lg border border-zinc-200 bg-cartao p-5">
          <h2 className="titulo-secao">Cliente</h2>
          {cliente ? (
            <div className="flex items-start justify-between gap-2 text-sm">
              <div>
                <div className="font-medium">{cliente.nome}</div>
                <div className="font-mono text-xs text-zinc-500">{formatarDocumento(cliente.documento)}</div>
              </div>
              <button type="button" className="text-xs underline" onClick={() => setCliente(undefined)}>
                Trocar
              </button>
            </div>
          ) : (
            <>
              <BuscaCliente onSelecionar={setCliente} />
              <p className="mt-2 text-xs text-zinc-500">Opcional, mas obrigatório para troca e venda a prazo.</p>
            </>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-zinc-200 bg-cartao p-5 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatarReais(subtotal)}</span>
          </div>
          <label className="campo">
            <span>Desconto geral (R$ ou %)</span>
            <input inputMode="decimal" value={descontoGeral} onChange={(e) => setDescontoGeral(e.target.value)} placeholder="0,00" />
          </label>
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatarReais(total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pago</span>
            <span>{formatarReais(pago)}</span>
          </div>
          <div className={`flex justify-between font-medium ${falta === 0 ? "text-green-700" : "text-red-600"}`}>
            <span>{falta >= 0 ? "Falta" : "Excedente"}</span>
            <span>{formatarReais(Math.abs(falta))}</span>
          </div>
          <label className="campo">
            <span>Observações</span>
            <textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </label>
          {erro && <p className="text-red-600">{erro}</p>}
          <button type="button" className="btn-primario w-full" disabled={enviando || itens.length === 0} onClick={finalizar}>
            {enviando ? "Finalizando..." : "Finalizar venda"}
          </button>
        </section>
      </aside>
    </div>
  );
}

function BuscaProduto({ onEscolher }: { onEscolher: (o: OpcaoVenda) => void }) {
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<OpcaoVenda[]>([]);

  useEffect(() => {
    const t = setTimeout(() => buscarParaVenda(termo).then(setOpcoes), 250);
    return () => clearTimeout(t);
  }, [termo]);

  return (
    <div className="relative">
      <label className="campo">
        <span>Buscar produto</span>
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Nome, modelo, IMEI, série ou código de barras"
          onKeyDown={(e) => {
            // Leitor de código de barras: Enter adiciona o primeiro resultado.
            if (e.key === "Enter" && opcoes[0]) {
              e.preventDefault();
              onEscolher(opcoes[0]);
              setTermo("");
            }
          }}
        />
      </label>
      {opcoes.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-80 w-full divide-y divide-zinc-100 overflow-auto rounded-md border border-zinc-200 bg-cartao shadow-lg">
          {opcoes.map((o) => (
            <li key={o.chave}>
              <button
                type="button"
                disabled={o.disponivel < 1}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:opacity-40"
                onClick={() => {
                  onEscolher(o);
                  setTermo("");
                }}
              >
                <span>
                  <span className="font-medium">{o.descricao}</span>
                  <span className="block text-xs text-zinc-500">{o.detalhe}</span>
                </span>
                <span className="whitespace-nowrap">{formatarReais(o.preco)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormTroca({ troca, onChange }: { troca: Troca; onChange: (t: Troca) => void }) {
  const campo = (k: keyof Troca) => ({
    value: troca[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...troca, [k]: e.target.value }),
  });
  return (
    <div className="mt-3 grid gap-3 border-t border-zinc-100 pt-3 sm:grid-cols-4">
      <label className="campo sm:col-span-2">
        <span>Modelo</span>
        <input {...campo("modelo")} list="modelos-troca" placeholder="ex.: iPhone 12" />
      </label>
      <label className="campo">
        <span>Capacidade</span>
        <input {...campo("capacidade")} placeholder="128 GB" />
      </label>
      <label className="campo">
        <span>Cor</span>
        <input {...campo("cor")} />
      </label>
      <label className="campo">
        <span>IMEI</span>
        <input {...campo("imei")} inputMode="numeric" maxLength={15} />
      </label>
      <label className="campo">
        <span>Nº de série</span>
        <input {...campo("serial")} />
      </label>
      <label className="campo">
        <span>Condição</span>
        <select {...campo("condicao")}>
          {(["SEMINOVO_A", "SEMINOVO_B", "SEMINOVO_C"] as const).map((c) => (
            <option key={c} value={c}>
              {CONDICOES[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Bateria (%)</span>
        <input {...campo("saudeBateria")} inputMode="numeric" />
      </label>
      <div className="sm:col-span-4">
        <VerificarImei imei={troca.imei.trim()} />
      </div>
      <label className="campo sm:col-span-4">
        <span>Observações da avaliação</span>
        <input {...campo("observacoes")} placeholder="ex.: tela original, pequeno risco na traseira" />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={troca.icloudDesativado} onChange={(e) => onChange({ ...troca, icloudDesativado: e.target.checked })} />
        iCloud / Buscar iPhone desativado e aparelho restaurado
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={troca.procedenciaDeclarada} onChange={(e) => onChange({ ...troca, procedenciaDeclarada: e.target.checked })} />
        Cliente declarou a procedência (é dono do aparelho)
      </label>
      <datalist id="modelos-troca">
        {["iPhone 11", "iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16", "iPhone 17"].flatMap((m) =>
          ["", " Pro", " Pro Max"].map((s) => <option key={m + s} value={m + s} />),
        )}
      </datalist>
    </div>
  );
}
