import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { garantirCategorias, intervaloDoPeriodo, PERIODOS } from "@/lib/financeiro";
import { lerFiltros, paramsDosFiltros, whereDosFiltros } from "@/lib/financeiro-filtros";
import { dataLocal, inicioDeHoje, ymdLocal } from "@/lib/tempo";
import { FORMAS_PAGAMENTO, formatarReais } from "@/lib/vendas";
import { baixarLancamento, cancelarLancamento, estornarLancamento } from "./actions";
import { FiltrosFluxo, NovoLancamento } from "./Componentes";

const LIMITE = 2000;

export default async function FluxoDeCaixa({ searchParams }: PageProps<"/financeiro">) {
  await exigirUsuario("financeiro");
  const f = lerFiltros(await searchParams);
  if ((await prisma.categoriaFinanceira.count()) === 0) await prisma.$transaction((tx) => garantirCategorias(tx));

  const { inicio, fim } = intervaloDoPeriodo(f.periodo, f.de, f.ate);
  const hoje = inicioDeHoje();
  const hojeYmd = ymdLocal(new Date());
  const where = whereDosFiltros(f);

  const [lancamentos, totais, categorias, abertos, vencidos] = await Promise.all([
    prisma.lancamento.findMany({
      where,
      include: { categoria: true, cliente: { select: { nome: true } }, fornecedor: { select: { razaoSocial: true } } },
      orderBy: f.base === "pagamento" ? [{ pagoEm: "asc" }, { criadoEm: "asc" }] : [{ vencimento: "asc" }, { criadoEm: "asc" }],
      take: LIMITE,
    }),
    // Totais no banco: a lista acima é limitada.
    prisma.lancamento.groupBy({ by: ["tipo"], where, _sum: { valor: true } }),
    prisma.categoriaFinanceira.findMany({ where: { ativa: true }, orderBy: [{ tipo: "asc" }, { nome: "asc" }] }),
    prisma.lancamento.groupBy({ by: ["tipo"], where: { status: "PENDENTE", vencimento: { gte: inicio, lt: fim } }, _sum: { valor: true } }),
    prisma.lancamento.groupBy({ by: ["tipo"], where: { status: "PENDENTE", vencimento: { lt: hoje } }, _sum: { valor: true }, _count: true }),
  ]);

  const soma = (tipo: string) => Number(totais.find((t) => t.tipo === tipo)?._sum.valor ?? 0);
  const entradas = soma("ENTRADA");
  const saidas = soma("SAIDA");
  const aberto = (tipo: string) => Number(abertos.find((a) => a.tipo === tipo)?._sum.valor ?? 0);
  const vencido = (tipo: string) => vencidos.find((a) => a.tipo === tipo);

  const dataDe = (l: (typeof lancamentos)[number]) => (f.base === "pagamento" ? (l.pagoEm ?? l.vencimento) : l.vencimento);
  const chave = (l: (typeof lancamentos)[number]) =>
    f.agrupar === "dia"
      ? dataLocal(dataDe(l))
      : f.agrupar === "categoria"
        ? (l.categoria?.nome ?? "Sem categoria")
        : f.agrupar === "forma"
          ? l.forma
            ? FORMAS_PAGAMENTO[l.forma]
            : "Sem forma"
          : "";
  const grupos = new Map<string, typeof lancamentos>();
  for (const l of lancamentos) grupos.set(chave(l), [...(grupos.get(chave(l)) ?? []), l]);

  const titulo = f.periodo === "personalizado" ? `${dataLocal(inicio)} a ${dataLocal(new Date(fim.getTime() - 1))}` : PERIODOS[f.periodo];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Fluxo de caixa</h1>
          <p className="text-sm text-zinc-500">
            {f.base === "pagamento" ? "Realizado" : "Previsto"} · {titulo}
          </p>
        </div>
        <a href={`/financeiro/exportar?${paramsDosFiltros(f)}`} className="btn-secundario">
          Exportar planilha (CSV)
        </a>
      </div>

      <FiltrosFluxo filtros={f} categorias={categorias} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card titulo="Entradas" valor={entradas} cor="text-green-700" />
        <Card titulo="Saídas" valor={saidas} cor="text-red-600" />
        <Card titulo="Saldo" valor={entradas - saidas} cor={entradas - saidas >= 0 ? "text-zinc-900" : "text-red-600"} />
      </div>
      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-cartao p-4">
          A receber no período: <b>{formatarReais(aberto("ENTRADA"))}</b>
          {vencido("ENTRADA") && (
            <div className="text-red-600">
              {vencido("ENTRADA")!._count} recebimento(s) vencido(s): {formatarReais(Number(vencido("ENTRADA")!._sum.valor ?? 0))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-zinc-200 bg-cartao p-4">
          A pagar no período: <b>{formatarReais(aberto("SAIDA"))}</b>
          {vencido("SAIDA") && (
            <div className="text-red-600">
              {vencido("SAIDA")!._count} conta(s) vencida(s): {formatarReais(Number(vencido("SAIDA")!._sum.valor ?? 0))}
            </div>
          )}
        </div>
      </div>

      <details className="rounded-lg border border-zinc-200 bg-cartao p-5">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-500">Novo lançamento (despesa ou receita)</summary>
        <div className="mt-4">
          <NovoLancamento categorias={categorias} />
        </div>
      </details>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-cartao">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">{f.base === "pagamento" ? "Pago em" : "Vencimento"}</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Forma</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {[...grupos.entries()].map(([grupo, itens]) => {
              const saldo = itens.reduce((s, l) => s + (l.tipo === "ENTRADA" ? 1 : -1) * Number(l.valor), 0);
              return [
                grupo && (
                  <tr key={`g-${grupo}`} className="bg-zinc-50">
                    <td colSpan={5} className="px-4 py-2 font-semibold">
                      {grupo} <span className="font-normal text-zinc-500">({itens.length})</span>
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold ${saldo < 0 ? "text-red-600" : "text-green-700"}`}>{formatarReais(saldo)}</td>
                    <td />
                  </tr>
                ),
                ...itens.map((l) => {
                  const vencido = l.status === "PENDENTE" && l.vencimento < hoje;
                  return (
                    <tr key={l.id} className="border-b border-zinc-100 align-top last:border-0">
                      <td className="px-4 py-2 whitespace-nowrap">{dataLocal(dataDe(l))}</td>
                      <td className="px-4 py-2">
                        {l.vendaId ? (
                          <Link href={`/vendas/${l.vendaId}`} className="hover:underline">
                            {l.descricao}
                          </Link>
                        ) : l.osId ? (
                          <Link href={`/os/${l.osId}`} className="hover:underline">
                            {l.descricao}
                          </Link>
                        ) : (
                          l.descricao
                        )}
                        {l.parcela && <span className="text-zinc-500"> ({l.parcela}/{l.totalParcelas})</span>}
                        <div className="text-xs text-zinc-500">{l.cliente?.nome ?? l.fornecedor?.razaoSocial}</div>
                      </td>
                      <td className="px-4 py-2">{l.categoria?.nome ?? "-"}</td>
                      <td className="px-4 py-2">{l.forma ? FORMAS_PAGAMENTO[l.forma] : "-"}</td>
                      <td className="px-4 py-2">
                        {l.status === "PAGO" ? (
                          <span className="text-green-700">Pago</span>
                        ) : l.status === "CANCELADO" ? (
                          <span className="text-zinc-400">Cancelado</span>
                        ) : (
                          <span className={vencido ? "font-medium text-red-600" : "text-amber-700"}>
                            {vencido ? "Vencido" : l.tipo === "ENTRADA" ? "A receber" : "A pagar"}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-2 text-right font-medium whitespace-nowrap ${l.tipo === "ENTRADA" ? "text-green-700" : "text-red-600"}`}>
                        {l.tipo === "ENTRADA" ? "+" : "-"} {formatarReais(Number(l.valor))}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {l.status === "PENDENTE" && (
                          <form action={baixarLancamento.bind(null, l.id)} className="flex items-center justify-end gap-1">
                            <input type="date" name="data" defaultValue={hojeYmd} className="w-32 rounded border border-zinc-300 px-1 py-0.5 text-xs" />
                            <BotaoEnviar className="rounded-full bg-azul px-3 py-1 text-xs text-white hover:bg-azul-escuro disabled:opacity-50">{l.tipo === "ENTRADA" ? "Recebido" : "Pago"}</BotaoEnviar>
                          </form>
                        )}
                        {l.status === "PAGO" && !l.vendaId && (
                          <form action={estornarLancamento.bind(null, l.id)}>
                            <BotaoEnviar className="text-xs text-zinc-500 underline disabled:opacity-50" confirmar="Estornar este lançamento? Ele volta a ficar em aberto.">
                              Estornar
                            </BotaoEnviar>
                          </form>
                        )}
                        {l.status === "PENDENTE" && !l.vendaId && (
                          <form action={cancelarLancamento.bind(null, l.id)}>
                            <BotaoEnviar className="mt-1 text-xs text-zinc-500 underline disabled:opacity-50" confirmar="Cancelar este lançamento?">
                              Cancelar
                            </BotaoEnviar>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                }),
              ];
            })}
            {lancamentos.length === LIMITE && (
              <tr>
                <td colSpan={7} className="px-4 py-3 text-center text-xs text-zinc-500">
                  Mostrando os primeiros {LIMITE} lançamentos; os totais acima consideram todos. Refine os filtros ou exporte a planilha.
                </td>
              </tr>
            )}
            {lancamentos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  Nenhum lançamento encontrado com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ titulo, valor, cor }: { titulo: string; valor: number; cor: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-cartao p-5">
      <div className="text-sm text-zinc-500">{titulo}</div>
      <div className={`mt-1 text-2xl font-semibold ${cor}`}>{formatarReais(valor)}</div>
    </div>
  );
}
