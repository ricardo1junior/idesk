"use server";

import { Prisma, type Perfil } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import { cookies } from "next/headers";
import { COOKIE_SESSAO } from "@/lib/auth-cookie";
import { prisma, sessaoPorHash } from "@/lib/db";
import { hashToken } from "@/lib/sessao-token";
import { PERFIS } from "@/lib/permissoes";
import { gerarHash } from "@/lib/senha";

export type EstadoUsuario = { erro?: string; ok?: string; valores?: Record<string, string> };

const novoUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  email: z.email("E-mail inválido").transform((v) => v.toLowerCase()),
  perfil: z.enum(["ADMIN", "VENDEDOR", "TECNICO", "FINANCEIRO", "ESTAGIARIO"]),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export async function criarUsuario(_e: EstadoUsuario, formData: FormData): Promise<EstadoUsuario> {
  await exigirUsuario("usuarios");
  const r = novoUsuarioSchema.safeParse(Object.fromEntries(formData));
  const valores = { nome: String(formData.get("nome") ?? ""), email: String(formData.get("email") ?? ""), perfil: String(formData.get("perfil") ?? "") };
  if (!r.success) return { erro: r.error.issues[0].message, valores };
  try {
    await prisma.usuario.create({
      data: { nome: r.data.nome, email: r.data.email, perfil: r.data.perfil, senhaHash: await gerarHash(r.data.senha) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { erro: "Já existe um usuário com este e-mail.", valores };
    throw e;
  }
  revalidatePath("/usuarios");
  return { ok: `Usuário ${r.data.nome} criado.` };
}

export async function alterarUsuario(id: string, _e: EstadoUsuario, formData: FormData): Promise<EstadoUsuario> {
  const eu = await exigirUsuario("usuarios");
  const alvo = await prisma.usuario.findFirst({ where: { id }, select: { superAdmin: true } });
  if (!alvo) return { erro: "Usuário não encontrado." };
  // O dono do sistema só pode ser alterado por ele mesmo (senão um administrador da loja tomaria a conta dele).
  if (alvo.superAdmin && !eu.superAdmin) return { erro: "Esta conta é do dono do sistema e não pode ser alterada aqui." };
  // Ninguém tira o próprio acesso de administrador nem se desativa.
  const proprio = id === eu.id;
  const perfil = String(formData.get("perfil") ?? "");
  if (!proprio && !Object.hasOwn(PERFIS, perfil)) return { erro: "Perfil inválido." };
  const ativo = formData.get("ativo") === "on";
  const novaSenha = String(formData.get("novaSenha") ?? "");
  if (novaSenha && novaSenha.length < 8) return { erro: "A nova senha precisa ter pelo menos 8 caracteres." };
  await prisma.usuario.update({
    where: { id },
    data: {
      ...(proprio ? {} : { perfil: perfil as Perfil, ativo }),
      ...(novaSenha ? { senhaHash: await gerarHash(novaSenha) } : {}),
    },
  });
  // Senha trocada ou acesso desativado: encerra as sessões abertas (menos a sua, se for você).
  if (novaSenha || (!proprio && !ativo)) {
    const token = (await cookies()).get(COOKIE_SESSAO)?.value;
    await prisma.sessao.deleteMany({ where: { usuarioId: id, ...(proprio && token ? { NOT: { id: hashToken(token) } } : {}) } });
    sessaoPorHash.limpar();
  }
  revalidatePath("/usuarios");
  return { ok: novaSenha ? "Salvo. A nova senha já vale." : "Salvo." };
}
