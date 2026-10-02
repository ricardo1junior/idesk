import { z } from "zod";
import { cnpjValido, cpfValido, somenteDigitos } from "./documentos";
import { cepValido, emailValido, nomeValido, telefoneValido } from "./mascaras";
import { ymdValido } from "./tempo";

const TELEFONE_INVALIDO = "Telefone inválido. Use DDD + número, ex.: (11) 99999-9999";

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
    email: opcional.transform((v) => v?.toLowerCase() ?? v).refine((v) => !v || emailValido(v), "E-mail inválido"),
    telefone: opcional.transform((v) => (v ? somenteDigitos(v) : v)).refine((v) => !v || telefoneValido(v), TELEFONE_INVALIDO),
    whatsapp: opcional.transform((v) => (v ? somenteDigitos(v) : v)).refine((v) => !v || telefoneValido(v), TELEFONE_INVALIDO),
    cep: opcional.transform((v) => (v ? somenteDigitos(v) : v)).refine((v) => !v || cepValido(v), "CEP deve ter 8 dígitos"),
    logradouro: opcional,
    numero: opcional,
    complemento: opcional,
    bairro: opcional,
    cidade: opcional.refine((v) => !v || nomeValido(v), "Cidade não pode ter números"),
    uf: opcional.transform((v) => (v ? v.toUpperCase().slice(0, 2) : v)),
    observacoes: opcional,
  })
  .superRefine((c, ctx) => {
    if (c.tipo === "PF" && !nomeValido(c.nome)) ctx.addIssue({ code: "custom", path: ["nome"], message: "O nome não pode ter números nem símbolos" });
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
      const valor = c.tipo === "EMAIL" ? c.valor.toLowerCase() : somenteDigitos(c.valor);
      if (c.tipo === "EMAIL" && !emailValido(valor)) erros[`contato${c.n}`] = "E-mail inválido";
      if (c.tipo === "TELEFONE" && !telefoneValido(valor)) erros[`contato${c.n}`] = TELEFONE_INVALIDO;
      return { tipo: c.tipo, valor, rotulo: c.rotulo || null, whatsapp: c.tipo === "TELEFONE" && c.whatsapp, ordem };
    });

  const enderecos = dados.enderecos
    .map((e, n) => ({ ...e, n }))
    .filter((e) => [e.cep, e.logradouro, e.numero, e.bairro, e.cidade].some(Boolean))
    .map(({ n, ...e }) => {
      if (e.cep && !cepValido(e.cep)) erros[`endereco${n}`] = "CEP deve ter 8 dígitos";
      return e;
    })
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
