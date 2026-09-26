import type { FormaPagamento } from "@prisma/client";
import { z } from "zod";

export const FORMAS_PAGAMENTO: Record<FormaPagamento, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  TRANSFERENCIA: "Transferência",
  DEBITO: "Cartão de débito",
  CREDITO: "Cartão de crédito",
  BOLETO: "Boleto",
  A_PRAZO: "A prazo",
  TROCA: "Aparelho na troca",
};

// Centavos inteiros evitam erros de arredondamento nas somas.
export const centavos = (v: number) => Math.round(v * 100);

const valor = z.number().finite().min(0);

export const trocaSchema = z.object({
  modelo: z.string().trim().min(2, "Troca: informe o modelo"),
  capacidade: z.string().trim().optional(),
  cor: z.string().trim().optional(),
  imei: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{15}$/.test(v), "Troca: IMEI deve ter 15 dígitos"),
  serial: z.string().trim().optional(),
  condicao: z.enum(["SEMINOVO_A", "SEMINOVO_B", "SEMINOVO_C"]),
  saudeBateria: z.number().int().min(0).max(100).nullable().optional(),
  icloudDesativado: z.literal(true, "Troca: o iCloud / Buscar precisa estar desativado"),
  procedenciaDeclarada: z.literal(true, "Troca: o cliente precisa declarar a procedência do aparelho"),
  observacoes: z.string().trim().optional(),
});

export const vendaSchema = z
  .object({
    clienteId: z.string().nullable(),
    itens: z
      .array(
        z.object({
          produtoId: z.string(),
          aparelhoId: z.string().nullable(),
          descricao: z.string().min(1),
          quantidade: z.number().int().min(1, "Quantidade mínima é 1"),
          valorUnit: valor,
          desconto: valor,
        }),
      )
      .min(1, "Adicione pelo menos um item"),
    desconto: valor,
    pagamentos: z.array(
      z.object({
        forma: z.enum(["DINHEIRO", "PIX", "TRANSFERENCIA", "DEBITO", "CREDITO", "BOLETO", "A_PRAZO", "TROCA"]),
        valor: valor.refine((v) => v > 0, "Pagamento com valor zero"),
        parcelas: z.number().int().min(1).max(24),
        primeiroVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        troca: trocaSchema.nullable(),
      }),
    ),
    observacoes: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    v.itens.forEach((i, n) => {
      if (i.aparelhoId && i.quantidade !== 1) ctx.addIssue({ code: "custom", path: ["itens", n], message: "Aparelho com IMEI é vendido um por linha" });
      if (centavos(i.desconto) > centavos(i.valorUnit * i.quantidade)) {
        ctx.addIssue({ code: "custom", path: ["itens", n], message: `Desconto maior que o valor do item "${i.descricao}"` });
      }
    });
    v.pagamentos.forEach((p, n) => {
      if (p.forma === "TROCA" && !p.troca) ctx.addIssue({ code: "custom", path: ["pagamentos", n], message: "Preencha os dados do aparelho da troca" });
    });
    if (v.pagamentos.some((p) => p.forma === "TROCA" || p.forma === "A_PRAZO") && !v.clienteId) {
      ctx.addIssue({ code: "custom", path: ["clienteId"], message: "Troca ou venda a prazo exigem cliente identificado" });
    }
    const t = calcularTotais(v.itens, v.desconto);
    if (t.total < 0) ctx.addIssue({ code: "custom", path: ["desconto"], message: "Desconto maior que o subtotal" });
    const pago = somaPagamentos(v.pagamentos);
    if (centavos(pago) !== centavos(t.total)) {
      ctx.addIssue({
        code: "custom",
        path: ["pagamentos"],
        message: `Pagamentos (${formatarReais(pago)}) não fecham com o total (${formatarReais(t.total)})`,
      });
    }
  });

export type VendaEntrada = z.infer<typeof vendaSchema>;
export type TrocaEntrada = z.infer<typeof trocaSchema>;

type ItemCalculo = { quantidade: number; valorUnit: number; desconto: number };

export function totalItem(i: ItemCalculo): number {
  return (centavos(i.valorUnit) * i.quantidade - centavos(i.desconto)) / 100;
}

export function calcularTotais(itens: ItemCalculo[], descontoGeral: number) {
  const subtotalC = itens.reduce((s, i) => s + centavos(totalItem(i)), 0);
  const totalC = subtotalC - centavos(descontoGeral);
  return { subtotal: subtotalC / 100, total: totalC / 100 };
}

export function somaPagamentos(pagamentos: { valor: number }[]): number {
  return pagamentos.reduce((s, p) => s + centavos(p.valor), 0) / 100;
}

export function formatarReais(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
