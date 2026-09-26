"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { criarSessao, encerrarSessao } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { conferirSenha, gerarHash } from "@/lib/senha";

export type EstadoLogin = { erro?: string; email?: string };

export async function entrar(_e: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const ok = usuario?.ativo && (await conferirSenha(senha, usuario.senhaHash));
  if (!usuario || !ok) return { erro: "E-mail ou senha incorretos.", email };
  await criarSessao(usuario.id);
  redirect("/");
}

const primeiroAcessoSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome"),
    email: z.email("E-mail inválido").transform((v) => v.toLowerCase()),
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: "As senhas não conferem", path: ["confirmacao"] });

// Cria o primeiro administrador. Só funciona enquanto não existir nenhum usuário.
export async function criarAdministrador(_e: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  if ((await prisma.usuario.count()) > 0) return { erro: "O administrador já foi criado. Faça login." };
  const r = primeiroAcessoSchema.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erro: r.error.issues[0].message, email: String(formData.get("email") ?? "") };
  const usuario = await prisma.usuario.create({
    data: { nome: r.data.nome, email: r.data.email, senhaHash: await gerarHash(r.data.senha), perfil: "ADMIN" },
  });
  await criarSessao(usuario.id);
  redirect("/");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
