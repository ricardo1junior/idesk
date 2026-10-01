import { z } from "zod";
import { cnpjValido, cpfValido, somenteDigitos } from "./documentos";
import { ymdValido } from "./tempo";

const opcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const clienteSchema = z
  .object({
    tipo: z.enum(["PF", "PJ"]),
    nome: z.string().trim().min(2, "Informe o nome"),
    nomeFantasia: opcional,
    documento: z.string().transform(somenteDigitos),
    rg: opcional,
    dataNascimento: opcional.refine((v) => !v || ymdValido(v), "Data inválida"),
    inscricaoEstadual: opcional,
    inscricaoMunicipal: opcional,
    email: opcional.refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido"),
    telefone: opcional.transform((v) => (v ? somenteDigitos(v) : v)),
    whatsapp: opcional.transform((v) => (v ? somenteDigitos(v) : v)),
    cep: opcional.transform((v) => (v ? somenteDigitos(v) : v)),
    logradouro: opcional,
    numero: opcional,
    complemento: opcional,
    bairro: opcional,
    cidade: opcional,
    uf: opcional.transform((v) => (v ? v.toUpperCase().slice(0, 2) : v)),
    observacoes: opcional,
  })
  .superRefine((c, ctx) => {
    const valido = c.tipo === "PF" ? cpfValido(c.documento) : cnpjValido(c.documento);
    if (!valido) {
      ctx.addIssue({ code: "custom", path: ["documento"], message: c.tipo === "PF" ? "CPF inválido" : "CNPJ inválido" });
    }
  });

export type ClienteEntrada = z.infer<typeof clienteSchema>;

export type EstadoFormulario = {
  erros?: Partial<Record<string, string>>;
  mensagem?: string;
  valores?: Record<string, string>;
};

const texto = z.string().trim().default("");

export const extrasSchema = z.object({
  contatos: z
    .array(z.object({ tipo: z.enum(["TELEFONE", "EMAIL"]), valor: texto, rotulo: texto, whatsapp: z.boolean().default(false) }))
    .default([]),
  enderecos: z
    .array(
      z.object({
        rotulo: texto,
        cep: texto,
        logradouro: texto,
        numero: texto,
        complemento: texto,
        bairro: texto,
        cidade: texto,
        uf: texto,
      }),
    )
    .default([]),
});

// Valida e normaliza os contatos/endereços adicionais. Linhas em branco são ignoradas.
export function prepararExtras(json: string | null) {
  const erros: Record<string, string> = {};
  let bruto: unknown = {};
  try {
    bruto = JSON.parse(json || "{}");
  } catch {
    // Formulário adulterado: trata como sem extras.
  }
  const r = extrasSchema.safeParse(bruto);
  const dados = r.success ? r.data : { contatos: [], enderecos: [] };

  const contatos = dados.contatos
    .map((c, n) => ({ ...c, n }))
    .filter((c) => c.valor)
    .map((c, ordem) => {
      if (c.tipo === "EMAIL" && !z.email().safeParse(c.valor).success) erros[`contato${c.n}`] = "E-mail inválido";
      const valor = c.tipo === "EMAIL" ? c.valor.toLowerCase() : somenteDigitos(c.valor);
      if (c.tipo === "TELEFONE" && valor.length < 8) erros[`contato${c.n}`] = "Telefone inválido";
      return { tipo: c.tipo, valor, rotulo: c.rotulo || null, whatsapp: c.tipo === "TELEFONE" && c.whatsapp, ordem };
    });

  const enderecos = dados.enderecos
    .filter((e) => [e.cep, e.logradouro, e.numero, e.bairro, e.cidade].some(Boolean))
    .map((e, ordem) => ({
      ...Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v || null])),
      cep: e.cep ? somenteDigitos(e.cep) : null,
      uf: e.uf ? e.uf.toUpperCase().slice(0, 2) : null,
      ordem,
    })) as {
    rotulo: string | null;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    ordem: number;
  }[];

  return { contatos, enderecos, erros };
}
