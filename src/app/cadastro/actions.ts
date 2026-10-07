"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { criarSessao } from "@/lib/auth";
import { nomePessoa } from "@/lib/mascaras";
import { cadastroAberto, criarLojaComAdmin } from "@/lib/nova-loja";

export type EstadoCadastro = { erro?: string; valores?: Record<string, string> };

const cadastroSchema = z
  .object({
    loja: z.string().trim().min(2, "Informe o nome da loja").max(80, "Nome da loja muito longo"),
    nome: nomePessoa("Informe seu nome"),
    email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido")),
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: "As senhas não conferem", path: ["confirmacao"] });

// Cadastros por endereço neste servidor: no máximo 5 por hora (freia robôs).
const porEndereco = new Map<string, number[]>();
const HORA_MS = 60 * 60 * 1000;

// Cadastro público: cria a loja, o administrador e o crédito de boas-vindas, e já entra no sistema.
export async function cadastrarLoja(_e: EstadoCadastro, formData: FormData): Promise<EstadoCadastro> {
  if (!cadastroAberto()) return { erro: "O cadastro de novas lojas está fechado. Fale com o suporte do sistema." };
  const valores = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const devolver = (erro: string): EstadoCadastro => ({ erro, valores: { loja: valores.loja ?? "", nome: valores.nome ?? "", email: valores.email ?? "" } });

  const codigo = process.env.CODIGO_CADASTRO?.trim();
  if (codigo && (valores.codigo ?? "").trim() !== codigo) return devolver("Código de cadastro incorreto.");

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const agora = Date.now();
  const recentes = (porEndereco.get(ip) ?? []).filter((t) => agora - t < HORA_MS);
  if (recentes.length >= 5) return devolver("Muitos cadastros seguidos. Tente de novo mais tarde.");

  const r = cadastroSchema.safeParse(valores);
  if (!r.success) return devolver(r.error.issues[0].message);
  const criado = await criarLojaComAdmin(r.data);
  if (!criado) return devolver("Este e-mail já tem cadastro. Entre pela tela de login.");

  if (porEndereco.size > 5000) porEndereco.clear();
  porEndereco.set(ip, [...recentes, agora]);
  await criarSessao(criado.usuarioId);
  redirect("/");
}
