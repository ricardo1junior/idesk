import { z } from "zod";
import { cnpjValido, cpfValido, somenteDigitos } from "./documentos";

// Dados e aparência da loja (Configurações > Dados da loja). Sem "server-only": usado nos testes.

const opcional = z.string().trim().transform((v) => v || null);

export const COR_PADRAO = "#0071e3";
export const MAX_BYTES_LOGO = 512 * 1024;

export const dadosLojaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da loja"),
  razaoSocial: opcional,
  documento: z
    .string()
    .transform(somenteDigitos)
    .refine((v) => !v || (v.length === 11 ? cpfValido(v) : v.length === 14 && cnpjValido(v)), "CPF ou CNPJ inválido")
    .transform((v) => v || null),
  telefone: z.string().transform(somenteDigitos).transform((v) => v || null),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido")
    .transform((v) => v || null),
  endereco: opcional,
  site: opcional,
  corDestaque: z
    .string()
    .trim()
    .refine((v) => !v || /^#[0-9a-fA-F]{6}$/.test(v), "Cor no formato #RRGGBB")
    .transform((v) => (v ? v.toLowerCase() : null)),
  smtpHost: opcional,
  smtpPorta: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v == null || (Number.isInteger(v) && v > 0 && v < 65536), "Porta inválida"),
  smtpSeguro: z.string().optional().transform((v) => v === "on" || v === "true"),
  smtpUsuario: opcional,
  smtpSenha: z.string().optional(),
  emailRemetente: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido")
    .transform((v) => v || null),
});

/** Variáveis de cor que a loja troca no tema (botões e seleção). */
export function estiloCor(cor: string | null | undefined): Record<string, string> | undefined {
  if (!cor || !/^#[0-9a-f]{6}$/i.test(cor)) return undefined;
  return {
    "--color-azul": cor,
    "--color-azul-escuro": `color-mix(in oklab, ${cor} 88%, black)`,
  };
}
