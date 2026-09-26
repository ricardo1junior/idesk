import type { FormaPagamento, Prisma, StatusLancamento, TipoLancamento } from "@prisma/client";
import { intervaloDoPeriodo, PERIODOS, type Periodo } from "./financeiro";
import { FORMAS_PAGAMENTO } from "./vendas";

export type Filtros = {
  periodo: Periodo;
  de?: string;
  ate?: string;
  base: "pagamento" | "vencimento";
  tipo?: TipoLancamento;
  status?: StatusLancamento | "ABERTOS";
  categoriaId?: string;
  forma?: FormaPagamento;
  q?: string;
  agrupar: "nenhum" | "dia" | "categoria" | "forma";
};

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function lerFiltros(sp: Record<string, string | string[] | undefined>): Filtros {
  const periodo = (texto(sp.periodo) ?? "mes") as Periodo;
  const tipo = texto(sp.tipo);
  const status = texto(sp.status);
  const forma = texto(sp.forma);
  const agrupar = texto(sp.agrupar);
  return {
    periodo: periodo in PERIODOS ? periodo : "mes",
    de: texto(sp.de),
    ate: texto(sp.ate),
    // "Realizado" olha a data em que o dinheiro entrou/saiu; "previsto" olha o vencimento.
    base: sp.base === "vencimento" ? "vencimento" : "pagamento",
    tipo: tipo === "ENTRADA" || tipo === "SAIDA" ? tipo : undefined,
    status: status === "PAGO" || status === "PENDENTE" || status === "CANCELADO" || status === "ABERTOS" ? status : undefined,
    categoriaId: texto(sp.categoriaId),
    forma: forma && forma in FORMAS_PAGAMENTO ? (forma as FormaPagamento) : undefined,
    q: texto(sp.q),
    agrupar: agrupar === "dia" || agrupar === "categoria" || agrupar === "forma" ? agrupar : "nenhum",
  };
}

export function whereDosFiltros(f: Filtros): Prisma.LancamentoWhereInput {
  const { inicio, fim } = intervaloDoPeriodo(f.periodo, f.de, f.ate);
  const data = { gte: inicio, lt: fim };
  return {
    ...(f.base === "pagamento" ? { pagoEm: data } : { vencimento: data }),
    // Na visão "realizado" só entram lançamentos pagos.
    status: f.base === "pagamento" ? "PAGO" : f.status === "ABERTOS" ? "PENDENTE" : (f.status ?? { not: "CANCELADO" }),
    tipo: f.tipo,
    categoriaId: f.categoriaId,
    forma: f.forma,
    ...(f.q && {
      OR: [
        { descricao: { contains: f.q, mode: "insensitive" } },
        { observacoes: { contains: f.q, mode: "insensitive" } },
        { cliente: { nome: { contains: f.q, mode: "insensitive" } } },
        { fornecedor: { razaoSocial: { contains: f.q, mode: "insensitive" } } },
      ],
    }),
  };
}

export function paramsDosFiltros(f: Filtros): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, String(v));
  return p.toString();
}
