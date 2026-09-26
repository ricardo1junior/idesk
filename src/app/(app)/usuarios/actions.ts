"use server";

import { Prisma, type Perfil } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PERFIS } from "@/lib/permissoes";
import { gerarHash } from "@/lib/senha";

export type EstadoUsuario = { erro?: string; ok?: string };

const novoUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  email: z.email("E-mail inválido").transform((v) => v.toLowerCase()),
  perfil: z.enum(["ADMIN", "VENDEDOR", "TECNICO", "FINANCEIRO", "ESTAGIARIO"]),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export async function criarUsuario(_e: EstadoUsuario, formData: FormData): Promise<EstadoUsuario> {
  await exigirUsuario("usuarios");
  const r = novoUsuarioSchema.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erro: r.error.issues[0].message };
  try {
    await prisma.usuario.create({
      data: { nome: r.data.nome, email: r.data.email, perfil: r.data.perfil, senhaHash: await gerarHash(r.data.senha) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { erro: "Já existe um usuário com este e-mail." };
    throw e;
  }
  revalidatePath("/usuarios");
  return { ok: `Usuário ${r.data.nome} criado.` };
}

export async function alterarUsuario(id: string, formData: FormData) {
  const eu = await exigirUsuario("usuarios");
  const perfil = String(formData.get("perfil")) as Perfil;
  if (!(perfil in PERFIS)) return;
  const ativo = formData.get("ativo") === "on";
  const novaSenha = String(formData.get("novaSenha") ?? "");
  // Ninguém tira o próprio acesso de administrador nem se desativa.
  const proprio = id === eu.id;
  await prisma.usuario.update({
    where: { id },
    data: {
      ...(proprio ? {} : { perfil, ativo }),
      ...(novaSenha.length >= 8 ? { senhaHash: await gerarHash(novaSenha) } : {}),
    },
  });
  if (!proprio && !ativo) await prisma.sessao.deleteMany({ where: { usuarioId: id } });
  revalidatePath("/usuarios");
}
