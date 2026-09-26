import { z } from "zod";
import { cnpjValido, cpfValido, somenteDigitos } from "./documentos";

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
    dataNascimento: opcional,
    inscricaoEstadual: opcional,
    inscricaoMunicipal: opcional,
    email: opcional.refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido"),
    telefone: opcional,
    whatsapp: opcional,
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
