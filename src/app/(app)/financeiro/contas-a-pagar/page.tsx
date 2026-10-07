import Form from "next/form";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DIA_MS, garantirCategorias } from "@/lib/financeiro";
import { dataLocal, inicioDeHoje, ymdLocal } from "@/lib/tempo";
import { FORMAS_PAGAMENTO, formatarReais } from "@/lib/vendas";
import { baixarLancamento, cancelarLancamento, estornarLancamento } from "../actions";
import { AbasFinanceiro, NovoLancamento } from "../Componentes";

// Contas a pagar: as lançadas à mão e as geradas pelas duplicatas das notas de entrada (XML).

const SITUACOES = { aberto: "Em aberto", pagas: "Pagas", todas: "Todas" } as const;
const ORIGENS = { todas: "Todas as origens", nota: "Notas de entrada (XML)", manual: "Lançadas à mão" } as const;
type Situacao = keyof typeof SITUACOES;
type Origem = keyof typeof ORIGENS;

export default async function ContasAPagar({ searchParams }: PageProps<"/financeiro/contas-a-pagar">) {
  await exigirUsuario("financeiro");
  const sp = await searchParams;
  const texto = (v: unknown) => (typeof v === "string" ? v : "");
  const situacao: Situacao = texto(sp.situacao) in SITUACOES ? (texto(sp.situacao) as Situacao) : "aberto";
  const origem: Origem = texto(sp.origem) in ORIGENS ? (texto(sp.origem) as Origem) : "todas";
  const fornecedorId = texto(sp.fornecedor);
  if ((await prisma.categoriaFinanceira.count()) === 0) await prisma.$transaction((tx) => garantirCategorias(tx));

  const hoje = inicioDeHoje();
  const hojeYmd = ymdLocal(new Date());
  const em = (dias: number) => new Date(hoje.getTime() + dias * DIA_MS);

  const where: Prisma.LancamentoWhereInput = {
    tipo: "SAIDA",
    status: situacao === "aberto" ? "PENDENTE" : situacao === "pagas" ? "PAGO" : { in: ["PENDENTE", "PAGO"] },
    ...(origem === "nota" ? { notaEntradaId: { not: null } } : origem === "manual" ? { notaEntradaId: null } : {}),
    ...(fornecedorId ? { fornecedorId } : {}),
  };
  const emAberto = { tipo: "SAIDA" as const, status: "PENDENTE" as const };
  const resumo = (vencimento: Prisma.DateTimeFilter) => prisma.lancamento.aggregate({ where: { ...emAberto, vencimento }, _sum: { valor: true }, _count: true });

  const [contas, vencidas, hojeVence, semana, mes, total, categorias, fornecedores] = await Promise.all([
    prisma.lancamento.findMany({
      where,
      include: {
        categoria: { select: { nome: true } },
        fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
        notaEntrada: { select: { id: true, numero: true } },
      },
      orderBy: situacao === "pagas" ? [{ pagoEm: "desc" }] : [{ vencimento: "asc" }, { criadoEm: "asc" }],
      take: 500,
    }),
    resumo({ lt: hoje }),
    resumo({ gte: hoje, lt: em(1) }),
    resumo({ gte: hoje, lt: em(7) }),
    resumo({ gte: hoje, lt: em(30) }),
    prisma.lancamento.aggregate({ where: emAberto, _sum: { valor: true }, _count: true }),
    prisma.categoriaFinanceira.findMany({ where: { ativa: true }, orderBy: [{ tipo: "asc" }, { nome: "asc" }] }),
    prisma.fornecedor.findMany({ select: { id: true, razaoSocial: true, nomeFantasia: true }, orderBy: { razaoSocial: "asc" } }),
  ]);
  const listaFornecedores = fornecedores.map((f) => ({ id: f.id, nome: f.nomeFantasia || f.razaoSocial }));
  const valor = (a: { _sum: { valor: Prisma.Decimal | null } }) => Number(a._sum.valor ?? 0);
  const somaLista = contas.reduce((s, c) => s + Number(c.valor), 0);

  return (
    <div className="max-w-6xl space-y-6">
      <AbasFinanceiro ativa="pagar" />
      <div>
        <h1 className="text-2xl font-semibold">Contas a pagar</h1>
        <p className="text-sm text-zinc-500">As notas de entrada (XML) já entram aqui sozinhas, uma conta por duplicata. As demais você lança abaixo.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Resumo titulo="Vencidas" valor={valor(vencidas)} qtd={vencidas._count} tom="text-red-600" destaque={vencidas._count > 0} />
        <Resumo titulo="Vencem hoje" valor={valor(hojeVence)} qtd={hojeVence._count} tom="text-amber-700" />
        <Resumo titulo="Próximos 7 dias" valor={valor(semana)} qtd={semana._count} />
        <Resumo titulo="Próximos 30 dias" valor={valor(mes)} qtd={mes._count} />
        <Resumo titulo="Total em aberto" valor={valor(total)} qtd={total._count} />
      </div>

      <details className="rounded-lg border border-zinc-200 bg-cartao p-5" open={total._count === 0}>
        <summary className="cursor-pointer text-sm font-semibold text-zinc-500">Nova conta a pagar</summary>
        <div className="mt-4">
          <NovoLancamento categorias={categorias} fornecedores={listaFornecedores} />
        </div>
      </details>

      <Form action="/financeiro/contas-a-pagar" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="campo">
          <span>Situação</span>
          <select name="situacao" defaultValue={situacao}>
            {Object.entries(SITUACOES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Origem</span>
          <select name="origem" defaultValue={origem}>
            {Object.entries(ORIGENS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Fornecedor</span>
          <select name="fornecedor" defaultValue={fornecedorId}>
            <option value="">Todos</option>
            {listaFornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-secundario">Filtrar</button>
      </Form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-cartao">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">{situacao === "pagas" ? "Pago em" : "Vencimento"}</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Fornecedor</th>
              <th className="px-4 py-3 font-medium">Origem</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {contas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  {situacao === "aberto" ? "Nenhuma conta em aberto. 🎉" : "Nenhuma conta encontrada."}
                </td>
              </tr>
            )}
            {contas.map((c) => {
              const dias = Math.round((c.vencimento.getTime() - hoje.getTime()) / DIA_MS);
              const aberta = c.status === "PENDENTE";
              return (
                <tr key={c.id} className="border-t border-zinc-100 align-top">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {dataLocal(aberta || !c.pagoEm ? c.vencimento : c.pagoEm)}
                    <div className="text-xs">
                      {!aberta ? (
                        <span className="text-green-700">Paga{c.forma ? ` · ${FORMAS_PAGAMENTO[c.forma]}` : ""}</span>
                      ) : dias < 0 ? (
                        <span className="font-medium text-red-600">Vencida há {-dias} {dias === -1 ? "dia" : "dias"}</span>
                      ) : dias === 0 ? (
                        <span className="font-medium text-amber-700">Vence hoje</span>
                      ) : (
                        <span className="text-zinc-500">Vence em {dias} {dias === 1 ? "dia" : "dias"}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {c.descricao}
                    {c.totalParcelas && <span className="text-zinc-500"> · parcela {c.parcela}/{c.totalParcelas}</span>}
                    <div className="text-xs text-zinc-500">{c.categoria?.nome ?? "Sem categoria"}</div>
                  </td>
                  <td className="px-4 py-2">{c.fornecedor ? c.fornecedor.nomeFantasia || c.fornecedor.razaoSocial : <span className="text-zinc-400">-</span>}</td>
                  <td className="px-4 py-2">
                    {c.notaEntrada ? (
                      <Link href={`/notas/entrada/${c.notaEntrada.id}`} className="text-link hover:underline">
                        NF {c.notaEntrada.numero} (XML)
                      </Link>
                    ) : (
                      <span className="text-zinc-500">Manual</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-medium whitespace-nowrap text-red-600">{formatarReais(Number(c.valor))}</td>
                  <td className="px-4 py-2 text-right">
                    {aberta ? (
                      <>
                        <form action={baixarLancamento.bind(null, c.id)} className="flex items-center justify-end gap-1">
                          <input type="date" name="data" defaultValue={hojeYmd} aria-label="Data do pagamento" className="w-32 rounded border border-zinc-300 px-1 py-0.5 text-xs" />
                          <select name="forma" defaultValue="PIX" aria-label="Forma de pagamento" className="rounded border border-zinc-300 px-1 py-0.5 text-xs">
                            {Object.entries(FORMAS_PAGAMENTO)
                              .filter(([f]) => f !== "TROCA" && f !== "A_PRAZO")
                              .map(([f, l]) => (
                                <option key={f} value={f}>
                                  {l}
                                </option>
                              ))}
                          </select>
                          <BotaoEnviar className="rounded-full bg-azul px-3 py-1 text-xs text-white hover:bg-azul-escuro disabled:opacity-50">Pagar</BotaoEnviar>
                        </form>
                        <form action={cancelarLancamento.bind(null, c.id)}>
                          <BotaoEnviar className="mt-1 text-xs text-zinc-500 underline disabled:opacity-50" confirmar="Cancelar esta conta a pagar?">
                            Cancelar
                          </BotaoEnviar>
                        </form>
                      </>
                    ) : (
                      <form action={estornarLancamento.bind(null, c.id)}>
                        <BotaoEnviar className="text-xs text-zinc-500 underline disabled:opacity-50" confirmar="Desfazer o pagamento? A conta volta a ficar em aberto.">
                          Desfazer pagamento
                        </BotaoEnviar>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {contas.length > 0 && (
            <tfoot className="border-t border-zinc-200 bg-zinc-50 font-semibold">
              <tr>
                <td colSpan={4} className="px-4 py-2">
                  {contas.length} {contas.length === 1 ? "conta" : "contas"}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap text-red-600">{formatarReais(somaLista)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function Resumo({ titulo, valor, qtd, tom = "text-zinc-900", destaque = false }: { titulo: string; valor: number; qtd: number; tom?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-lg border bg-cartao p-4 ${destaque ? "border-red-300" : "border-zinc-200"}`}>
      <div className="text-sm text-zinc-500">{titulo}</div>
      <div className={`text-xl font-semibold ${qtd ? tom : "text-zinc-400"}`}>{formatarReais(valor)}</div>
      <div className="text-xs text-zinc-500">
        {qtd} {qtd === 1 ? "conta" : "contas"}
      </div>
    </div>
  );
}
