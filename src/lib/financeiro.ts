import type { FormaPagamento, Prisma, TipoLancamento } from "@prisma/client";
import { z } from "zod";
import { paraNumero } from "./estoque";
import { dataHoraLocal } from "./tempo";

export const CATEGORIAS_PADRAO: Record<TipoLancamento, string[]> = {
  ENTRADA: ["Vendas", "Serviços (OS)", "Outras entradas"],
  SAIDA: ["Compra de mercadoria", "Aluguel", "Salários", "Impostos", "Energia, água e internet", "Outras despesas"],
};

export const DIA_MS = 86_400_000;

// Formas que entram no caixa na hora; as demais viram contas a receber por parcela.
const A_VISTA: FormaPagamento[] = ["DINHEIRO", "PIX", "TRANSFERENCIA", "DEBITO"];

/** Formas em que a loja escolhe a data do 1º vencimento (crédito segue o prazo da maquininha). */
export const COM_VENCIMENTO: FormaPagamento[] = ["BOLETO", "A_PRAZO"];

type ParcelaGerada = {
  valor: number;
  vencimento: Date;
  pago: boolean;
  parcela: number | null;
  totalParcelas: number | null;
};

// Divide um pagamento em parcelas (a última absorve a diferença de centavos).
// Crédito: a maquininha repassa uma parcela a cada 30 dias. Boleto/a prazo: vencimento mensal,
// a partir do 1º vencimento escolhido (ou um mês depois da venda, se não informado).
export function parcelarPagamento(
  forma: FormaPagamento,
  valor: number,
  parcelas: number,
  data: Date,
  primeiroVencimento?: string | null,
): ParcelaGerada[] {
  if (forma === "TROCA") return [];
  if (A_VISTA.includes(forma)) return [{ valor, vencimento: data, pago: true, parcela: null, totalParcelas: null }];
  const n = Math.max(1, parcelas);
  const centavos = Math.round(valor * 100);
  const base = Math.floor(centavos / n);
  return Array.from({ length: n }, (_, i) => {
    const v = i === n - 1 ? centavos - base * (n - 1) : base;
    let venc: Date;
    if (forma === "CREDITO") venc = new Date(data.getTime() + 30 * (i + 1) * DIA_MS);
    else if (primeiroVencimento && COM_VENCIMENTO.includes(forma)) {
      venc = dataHoraLocal(primeiroVencimento, "12:00");
      venc.setMonth(venc.getMonth() + i);
    } else {
      venc = new Date(data);
      venc.setMonth(venc.getMonth() + i + 1);
    }
    return { valor: v / 100, vencimento: venc, pago: false, parcela: n > 1 ? i + 1 : null, totalParcelas: n > 1 ? n : null };
  });
}

export async function categoriaId(tx: Prisma.TransactionClient, tipo: TipoLancamento, nome: string): Promise<string> {
  const c = await tx.categoriaFinanceira.upsert({ where: { nome_tipo: { nome, tipo } }, create: { nome, tipo }, update: {} });
  return c.id;
}

export async function garantirCategorias(tx: Prisma.TransactionClient) {
  for (const tipo of ["ENTRADA", "SAIDA"] as const) for (const nome of CATEGORIAS_PADRAO[tipo]) await categoriaId(tx, tipo, nome);
}

// Filtros da tela de fluxo de caixa, lidos da URL.
export type Periodo = "hoje" | "7dias" | "mes" | "mes_anterior" | "30dias" | "ano" | "personalizado";
export const PERIODOS: Record<Periodo, string> = {
  hoje: "Hoje",
  "7dias": "Últimos 7 dias",
  "30dias": "Próximos 30 dias",
  mes: "Este mês",
  mes_anterior: "Mês anterior",
  ano: "Este ano",
  personalizado: "Personalizado",
};

export function intervaloDoPeriodo(periodo: Periodo, de?: string, ate?: string, agora = new Date()): { inicio: Date; fim: Date } {
  const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const hoje = dia(agora);
  const amanha = new Date(hoje.getTime() + DIA_MS);
  switch (periodo) {
    case "hoje":
      return { inicio: hoje, fim: amanha };
    case "7dias":
      return { inicio: new Date(hoje.getTime() - 6 * DIA_MS), fim: amanha };
    case "30dias":
      return { inicio: hoje, fim: new Date(hoje.getTime() + 31 * DIA_MS) };
    case "mes_anterior":
      return { inicio: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), fim: new Date(hoje.getFullYear(), hoje.getMonth(), 1) };
    case "ano":
      return { inicio: new Date(hoje.getFullYear(), 0, 1), fim: new Date(hoje.getFullYear() + 1, 0, 1) };
    case "personalizado": {
      const i = de ? new Date(`${de}T00:00:00`) : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const f = ate ? new Date(new Date(`${ate}T00:00:00`).getTime() + DIA_MS) : amanha;
      return { inicio: i, fim: f };
    }
    default:
      return { inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1), fim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1) };
  }
}

const opcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const lancamentoSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  descricao: z.string().trim().min(2, "Informe a descrição"),
  valor: z
    .unknown()
    .transform(paraNumero)
    .refine((v) => Number.isFinite(v) && v > 0, "Informe o valor"),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
  parcelas: z.coerce.number().int().min(1).max(60).default(1),
  pago: z.enum(["sim"]).optional(),
  forma: z.enum(["DINHEIRO", "PIX", "TRANSFERENCIA", "DEBITO", "CREDITO", "BOLETO", "A_PRAZO"]).optional().or(z.literal("").transform(() => undefined)),
  categoriaId: opcional,
  observacoes: opcional,
});
