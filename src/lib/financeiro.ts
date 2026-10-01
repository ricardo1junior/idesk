import type { Tx } from "@/lib/db";
import type { FormaPagamento, TipoLancamento } from "@prisma/client";
import { z } from "zod";
import { paraNumero } from "./estoque";
import { dataHoraLocal, somarDias, somarMeses, ymdLocal, ymdValido } from "./tempo";

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
    // Datas mensais pelo calendário de Brasília; dia 31 cai no último dia dos meses curtos.
    const venc =
      forma === "CREDITO"
        ? new Date(data.getTime() + 30 * (i + 1) * DIA_MS)
        : primeiroVencimento && COM_VENCIMENTO.includes(forma)
          ? dataHoraLocal(somarMeses(primeiroVencimento, i), "12:00")
          : dataHoraLocal(somarMeses(ymdLocal(data), i + 1), "12:00");
    return { valor: v / 100, vencimento: venc, pago: false, parcela: n > 1 ? i + 1 : null, totalParcelas: n > 1 ? n : null };
  });
}

// createMany com skipDuplicates vira ON CONFLICT DO NOTHING: duas vendas simultâneas não colidem na
// chave única (empresaId, nome, tipo) e a transação não é abortada.
export async function categoriaId(tx: Tx, tipo: TipoLancamento, nome: string): Promise<string> {
  const achar = () => tx.categoriaFinanceira.findFirst({ where: { nome, tipo }, select: { id: true } });
  const c = await achar();
  if (c) return c.id;
  await tx.categoriaFinanceira.createMany({ data: [{ nome, tipo }], skipDuplicates: true });
  return (await achar())!.id;
}

export async function garantirCategorias(tx: Tx) {
  const data = (["ENTRADA", "SAIDA"] as const).flatMap((tipo) => CATEGORIAS_PADRAO[tipo].map((nome) => ({ nome, tipo })));
  await tx.categoriaFinanceira.createMany({ data, skipDuplicates: true });
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

// Intervalos pelo calendário de Brasília (início do dia às 00:00 -03:00), mesmo com o servidor em UTC.
export function intervaloDoPeriodo(periodo: Periodo, de?: string, ate?: string, agora = new Date()): { inicio: Date; fim: Date } {
  const h = ymdLocal(agora);
  const dia = (ymd: string) => dataHoraLocal(ymd, "00:00");
  const mes = h.slice(0, 8) + "01";
  const amanha = dia(somarDias(h, 1));
  switch (periodo) {
    case "hoje":
      return { inicio: dia(h), fim: amanha };
    case "7dias":
      return { inicio: dia(somarDias(h, -6)), fim: amanha };
    case "30dias":
      return { inicio: dia(h), fim: dia(somarDias(h, 31)) };
    case "mes_anterior":
      return { inicio: dia(somarMeses(mes, -1)), fim: dia(mes) };
    case "ano":
      return { inicio: dia(`${h.slice(0, 4)}-01-01`), fim: dia(`${Number(h.slice(0, 4)) + 1}-01-01`) };
    case "personalizado":
      return { inicio: dia(ymdValido(de) ? de : mes), fim: ymdValido(ate) ? dia(somarDias(ate, 1)) : amanha };
    default:
      return { inicio: dia(mes), fim: dia(somarMeses(mes, 1)) };
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
    .refine((v) => Number.isFinite(v), "Valor inválido")
    .refine((v) => v > 0, "Informe o valor"),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
  parcelas: z.coerce.number().int().min(1).max(60).default(1),
  pago: z.enum(["sim"]).optional(),
  forma: z.enum(["DINHEIRO", "PIX", "TRANSFERENCIA", "DEBITO", "CREDITO", "BOLETO", "A_PRAZO"]).optional().or(z.literal("").transform(() => undefined)),
  categoriaId: opcional,
  observacoes: opcional,
});
