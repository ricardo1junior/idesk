import type { CondicaoAparelho, TipoProduto } from "@prisma/client";
import { z } from "zod";

export const TIPOS_PRODUTO: Record<TipoProduto, string> = {
  APARELHO: "Aparelho",
  ACESSORIO: "Acessório",
  PECA: "Peça",
};

export const CONDICOES: Record<CondicaoAparelho, string> = {
  NOVO: "Novo",
  SEMINOVO_A: "Seminovo A (excelente)",
  SEMINOVO_B: "Seminovo B (bom)",
  SEMINOVO_C: "Seminovo C (marcas visíveis)",
};

// Garantia padrão (dias) por condição do aparelho vendido.
export const GARANTIA_PADRAO: Record<CondicaoAparelho, number> = {
  NOVO: 365,
  SEMINOVO_A: 90,
  SEMINOVO_B: 90,
  SEMINOVO_C: 90,
};
export const GARANTIA_ACESSORIO = 90;

export function paraNumero(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  // Aceita "1.234,56" e "1234.56"
  return Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
}

const opcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const dinheiro = z
  .unknown()
  .transform(paraNumero)
  .refine((v) => Number.isFinite(v) && v >= 0, "Valor inválido");

export const produtoSchema = z.object({
  tipo: z.enum(["APARELHO", "ACESSORIO", "PECA"]),
  descricao: z.string().trim().min(2, "Informe a descrição"),
  modelo: opcional,
  marca: opcional,
  codigoBarras: opcional,
  sku: opcional,
  ncm: opcional,
  precoCusto: dinheiro,
  precoVenda: dinheiro,
  estoqueMinimo: z.coerce.number().int().min(0).default(0),
  compativelCom: opcional,
});

export const aparelhoSchema = z.object({
  modelo: z.string().trim().min(2, "Informe o modelo"),
  cor: opcional,
  capacidade: opcional,
  imei: opcional.refine((v) => !v || /^\d{15}$/.test(v), "IMEI deve ter 15 dígitos"),
  imei2: opcional.refine((v) => !v || /^\d{15}$/.test(v), "IMEI 2 deve ter 15 dígitos"),
  serial: opcional.transform((v) => v?.toUpperCase() ?? v),
  condicao: z.enum(["NOVO", "SEMINOVO_A", "SEMINOVO_B", "SEMINOVO_C"]),
  saudeBateria: opcional.refine((v) => !v || (Number(v) >= 0 && Number(v) <= 100), "Bateria entre 0 e 100"),
  custo: dinheiro,
  observacoes: opcional,
});

export type AparelhoEntrada = z.infer<typeof aparelhoSchema>;
