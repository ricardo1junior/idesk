"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { nomePessoa } from "@/lib/mascaras";
import { criarSessao, encerrarSessao } from "@/lib/auth";
import { prismaBase as prisma } from "@/lib/db";
import { conferirSenha, gerarHash } from "@/lib/senha";

export type EstadoLogin = { erro?: string; email?: string; loja?: string; nome?: string };

// Tentativas erradas por e-mail neste servidor: depois de 5 em 15 minutos, espera 15 minutos.
const tentativas = new Map<string, { erros: number; desde: number }>();
const JANELA_MS = 15 * 60 * 1000;
// Hash qualquer para conferir a senha mesmo sem usuário (o tempo de resposta não revela quais e-mails existem).
let hashFalso: Promise<string> | null = null;

export async function entrar(_e: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const t = tentativas.get(email);
  if (t && Date.now() - t.desde < JANELA_MS && t.erros >= 5) {
    return { erro: "Muitas tentativas erradas. Aguarde 15 minutos e tente de novo.", email };
  }
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const senhaOk = await conferirSenha(senha, usuario?.senhaHash ?? (await (hashFalso ??= gerarHash("senha-falsa-para-tempo"))));
  if (!usuario || !senhaOk || !usuario.ativo) {
    const atual = t && Date.now() - t.desde < JANELA_MS ? t : { erros: 0, desde: Date.now() };
    if (tentativas.size > 5000) tentativas.clear();
    tentativas.set(email, { ...atual, erros: atual.erros + 1 });
    return { erro: "E-mail ou senha incorretos.", email };
  }
  tentativas.delete(email);
  const loja = await prisma.empresa.findUnique({ where: { id: usuario.empresaId }, select: { ativa: true } });
  if (!loja?.ativa) return { erro: "O acesso desta loja está bloqueado. Fale com o suporte do sistema.", email };
  await criarSessao(usuario.id);
  redirect("/");
}

const primeiroAcessoSchema = z
  .object({
    nome: nomePessoa("Informe seu nome"),
    email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido")),
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: "As senhas não conferem", path: ["confirmacao"] });

// Cria o primeiro administrador. Só funciona enquanto não existir nenhum usuário.
export async function criarAdministrador(_e: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  if ((await prisma.usuario.count()) > 0) return { erro: "O administrador já foi criado. Faça login." };
  // Em servidor público, só quem tem o código de primeiro acesso cria o administrador.
  const codigo = process.env.CODIGO_PRIMEIRO_ACESSO;
  if (codigo && String(formData.get("codigo") ?? "").trim() !== codigo) {
    return { erro: "Código de primeiro acesso incorreto.", email: String(formData.get("email") ?? "") };
  }
  const r = primeiroAcessoSchema.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erro: r.error.issues[0].message, email: String(formData.get("email") ?? ""), loja: String(formData.get("loja") ?? ""), nome: String(formData.get("nome") ?? "") };
  const nomeLoja = String(formData.get("loja") ?? "").trim() || "Minha loja";
  // Instalação nova: cria a primeira loja e o dono do sistema.
  const usuario = await prisma.$transaction(async (tx) => {
    // Dois envios ao mesmo tempo não criam dois donos do sistema.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(4242)`;
    if ((await tx.usuario.count()) > 0) return null;
    const empresa = await tx.empresa.create({ data: { nome: nomeLoja, isenta: true } });
    return tx.usuario.create({
      data: { empresaId: empresa.id, nome: r.data.nome, email: r.data.email, senhaHash: await gerarHash(r.data.senha), perfil: "ADMIN", superAdmin: true },
    });
  });
  if (!usuario) return { erro: "O administrador já foi criado. Faça login." };
  await criarSessao(usuario.id);
  redirect("/");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
