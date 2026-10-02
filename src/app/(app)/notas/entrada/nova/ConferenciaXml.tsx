"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Entrada } from "@/components/Entrada";
import { lerReais } from "@/lib/dinheiro";
import { formatarDocumento } from "@/lib/documentos";
import { dataLocal } from "@/lib/tempo";
import { formatarReais } from "@/lib/vendas";
import { buscarProdutosNota, conferirXml, importarNota, type Conferencia } from "../../actions";

type Acao = "vincular" | "novo" | "ignorar";
type Tipo = "APARELHO" | "ACESSORIO" | "PECA";
type Linha = {
  numero: number;
  acao: Acao;
  produtoId: string | null;
  produtoDescricao: string | null;
  produtoTipo: Tipo | null;
  novoTipo: Tipo;
  fator: number;
  precoVenda: string;
  imeis: string;
};

const TIPOS: Record<Tipo, string> = { APARELHO: "Aparelho (IMEI)", ACESSORIO: "Acessório", PECA: "Peça" };

// Sugere o tipo pelo NCM: 8517 = celulares, 8471 = computadores/tablets, 8517.62/9102 = relógios.
function tipoPorNcm(ncm: string | null, imeis: number): Tipo {
  if (imeis > 0 || /^(851713|851712|847130|910212|851762)/.test(ncm ?? "")) return "APARELHO";
  return "ACESSORIO";
}

export function ConferenciaXml() {
  const router = useRouter();
  const [xml, setXml] = useState("");
  const [dados, setDados] = useState<Conferencia | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  async function carregar(arquivo: File | undefined) {
    if (!arquivo) return;
    const texto = await arquivo.text();
    setErro(null);
    iniciar(async () => {
      const r = await conferirXml(texto);
      if (r.erro || !r.nota) {
        setDados(null);
        setErro(r.erro ?? "Não foi possível ler o XML.");
        return;
      }
      setXml(texto);
      setDados(r);
      setLinhas(
        r.nota.itens.map((item, i) => {
          const s = r.sugestoes?.[i] ?? null;
          return {
            numero: item.numero,
            acao: s ? "vincular" : "novo",
            produtoId: s?.produtoId ?? null,
            produtoDescricao: s?.descricao ?? null,
            produtoTipo: s?.tipo ?? null,
            novoTipo: tipoPorNcm(item.ncm, item.imeis.length),
            fator: s?.fator ?? 1,
            precoVenda: "",
            imeis: item.imeis.join("\n"),
          };
        }),
      );
    });
  }

  const alterar = (i: number, parte: Partial<Linha>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...parte } : l)));

  function confirmar() {
    setErro(null);
    const semProduto = linhas.find((l) => l.acao === "vincular" && !l.produtoId);
    if (semProduto) return setErro(`Item ${semProduto.numero}: escolha o produto do cadastro ou marque "Cadastrar novo".`);
    iniciar(async () => {
      let r;
      try {
        r = await importarNota(
          xml,
          linhas.map((l) => ({
            numero: l.numero,
            acao: l.acao,
            produtoId: l.acao === "vincular" ? l.produtoId : null,
            novoTipo: l.novoTipo,
            fator: Number(l.fator) || 1,
            precoVenda: lerReais(l.precoVenda) || 0,
            imeis: l.imeis.split(/[\s,;]+/).filter(Boolean),
          })),
        );
      } catch {
        // Mantém a conferência na tela para tentar de novo.
        return setErro("Não foi possível importar agora. Se os créditos do sistema acabaram, a loja está em modo consulta; recarregue e tente de novo.");
      }
      if (r.erro) return setErro(r.erro);
      router.push(`/notas/entrada/${r.id}`);
    });
  }

  const nota = dados?.nota;
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-cartao p-5">
        <label className="campo">
          <span>Arquivo XML da nota</span>
          <input type="file" accept=".xml,text/xml,application/xml" onChange={(e) => carregar(e.target.files?.[0])} />
        </label>
        {pendente && !nota && <p className="mt-2 text-sm text-zinc-500">Lendo a nota…</p>}
      </div>

      {erro && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

      {nota && (
        <>
          <div className="grid gap-4 rounded-lg border border-zinc-200 bg-cartao p-5 text-sm sm:grid-cols-4">
            <Info titulo="Fornecedor">
              {nota.emitente.nomeFantasia ?? nota.emitente.razaoSocial}
              <div className="text-xs text-zinc-500">
                {formatarDocumento(nota.emitente.cnpj)}
                {!dados?.fornecedorCadastrado && " · será cadastrado"}
              </div>
            </Info>
            <Info titulo="Nota">
              {nota.numero} série {nota.serie}
              <div className="text-xs text-zinc-500">Emitida em {dataLocal(new Date(nota.emissao))}</div>
            </Info>
            <Info titulo="Valor total">{formatarReais(nota.valorTotal)}</Info>
            <Info titulo="Contas a pagar">
              {nota.duplicatas.length === 0
                ? `1 conta de ${formatarReais(nota.valorTotal)}`
                : nota.duplicatas.map((d) => (
                    <div key={d.numero}>
                      {dataLocal(new Date(d.vencimento))}: {formatarReais(d.valor)}
                    </div>
                  ))}
            </Info>
          </div>

          <div className="space-y-3">
            {nota.itens.map((item, i) => {
              const l = linhas[i];
              if (!l) return null;
              const tipo = l.acao === "vincular" ? l.produtoTipo : l.novoTipo;
              const unidades = Math.round(item.quantidade * (Number(l.fator) || 1));
              const qtdImeis = l.imeis.split(/[\s,;]+/).filter(Boolean).length;
              return (
                <div key={item.numero} className={`rounded-lg border bg-cartao p-4 ${l.acao === "ignorar" ? "border-zinc-200 opacity-60" : "border-zinc-300"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">
                        {item.numero}. {item.descricao}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Cód. {item.codigo}
                        {item.ean && ` · EAN ${item.ean}`}
                        {item.ncm && ` · NCM ${item.ncm}`} · {item.quantidade} {item.unidade} × {formatarReais(item.valorUnitario)} · custo real{" "}
                        {formatarReais(item.custoUnitario)}/{item.unidade}
                      </div>
                    </div>
                    <div className="flex gap-1 text-sm" role="radiogroup" aria-label={`Ação do item ${item.numero}`}>
                      {(["vincular", "novo", "ignorar"] as Acao[]).map((a) => (
                        <label key={a} className="chip">
                          <input type="radio" className="sr-only" checked={l.acao === a} onChange={() => alterar(i, { acao: a })} />
                          <span>{a === "vincular" ? "Produto existente" : a === "novo" ? "Cadastrar novo" : "Não dar entrada"}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {l.acao !== "ignorar" && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-4">
                      {l.acao === "vincular" ? (
                        <BuscaProduto
                          selecionado={l.produtoDescricao}
                          onEscolher={(p) => alterar(i, { produtoId: p.id, produtoDescricao: p.descricao, produtoTipo: p.tipo })}
                        />
                      ) : (
                        <>
                          <label className="campo">
                            <span>Tipo</span>
                            <select value={l.novoTipo} onChange={(e) => alterar(i, { novoTipo: e.target.value as Tipo })}>
                              {Object.entries(TIPOS).map(([v, t]) => (
                                <option key={v} value={v}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="campo">
                            <span>Preço de venda (R$)</span>
                            <Entrada mascara="dinheiro" value={l.precoVenda} onChange={(e) => alterar(i, { precoVenda: e.target.value })} />
                          </label>
                        </>
                      )}
                      <label className="campo">
                        <span>Unidades por {item.unidade}</span>
                        <input type="number" min={1} value={l.fator} onChange={(e) => alterar(i, { fator: Number(e.target.value) })} />
                      </label>
                      <div className="flex items-end pb-2 text-sm text-zinc-600">
                        Entram {unidades} un. a {formatarReais(item.custoUnitario / (Number(l.fator) || 1))}
                      </div>
                      {tipo === "APARELHO" && (
                        <label className="campo sm:col-span-4">
                          <span>
                            IMEIs, um por linha ({qtdImeis} de {unidades})
                            {item.imeis.length > 0 && " · lidos da nota"}
                          </span>
                          <textarea rows={Math.min(6, Math.max(2, unidades))} value={l.imeis} onChange={(e) => alterar(i, { imeis: e.target.value.replace(/[^\d\n]/g, "") })} className="font-mono" />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-primario" onClick={confirmar} disabled={pendente}>
              {pendente ? "Importando…" : "Confirmar entrada no estoque"}
            </button>
            <span className="text-sm text-zinc-500">A nota fica guardada com o XML original.</span>
          </div>
        </>
      )}
    </div>
  );
}

function Info({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-zinc-500">{titulo}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

type ProdutoBusca = { id: string; descricao: string; tipo: Tipo };

function BuscaProduto({ selecionado, onEscolher }: { selecionado: string | null; onEscolher: (p: ProdutoBusca) => void }) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ProdutoBusca[]>([]);
  const ultima = useRef(0);
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <div className="relative sm:col-span-2">
      <label className="campo">
        <span>Produto do cadastro {selecionado && <b className="text-green-700">· {selecionado}</b>}</span>
        <input
          value={termo}
          placeholder={selecionado ? "Trocar produto…" : "Buscar por nome, modelo ou código"}
          onChange={(e) => {
            const t = e.target.value;
            setTermo(t);
            // Espera parar de digitar e ignora respostas de buscas antigas.
            clearTimeout(espera.current);
            if (t.trim().length < 2) return setResultados([]);
            const n = ++ultima.current;
            espera.current = setTimeout(async () => {
              const r = await buscarProdutosNota(t);
              if (n === ultima.current) setResultados(r);
            }, 250);
          }}
        />
      </label>
      {termo.length >= 2 && resultados.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-cartao text-sm shadow">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-zinc-100"
                onClick={() => {
                  onEscolher(p);
                  setTermo("");
                  setResultados([]);
                }}
              >
                {p.descricao} <span className="text-xs text-zinc-500">({TIPOS[p.tipo]})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
