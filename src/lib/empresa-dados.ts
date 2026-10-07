import { z } from "zod";
import { cnpjValido, cpfValido, somenteDigitos } from "./documentos";
import { telefoneValido } from "./mascaras";

// Dados e aparência da loja (Configurações > Dados da loja). Sem "server-only": usado nos testes.

const opcional = z.string().trim().transform((v) => v || null);

export const COR_PADRAO = "#0071e3";
export const MAX_BYTES_LOGO = 512 * 1024;

const PORTAS_SMTP = [25, 465, 587, 2525];
// Recusa endereços locais e de rede privada (localhost, 10.x, 192.168.x, 169.254.x, IPv6 local...).
function hostPublico(host: string) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || !h.includes(".")) return false;
  if (h.includes(":")) return false; // IPv6 literal
  const ip = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ip) return true;
  const [a, b] = [Number(ip[1]), Number(ip[2])];
  return !(a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224);
}

export const dadosLojaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da loja"),
  razaoSocial: opcional,
  documento: z
    .string()
    .transform(somenteDigitos)
    .refine((v) => !v || (v.length === 11 ? cpfValido(v) : v.length === 14 && cnpjValido(v)), "CPF ou CNPJ inválido")
    .transform((v) => v || null),
  telefone: z
    .string()
    .trim()
    .refine((v) => !v || telefoneValido(v), "Telefone inválido: DDD + número")
    .transform((v) => somenteDigitos(v) || null),
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
  // Só servidores de e-mail públicos: impede usar o envio para acessar a rede interna do servidor.
  smtpHost: opcional.refine((v) => !v || hostPublico(v), "Informe o endereço do servidor de e-mail (ex.: smtp.gmail.com)"),
  smtpPorta: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v == null || PORTAS_SMTP.includes(v), "Use a porta 587, 465, 25 ou 2525"),
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
