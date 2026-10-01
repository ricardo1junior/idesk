"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSuperAdmin } from "@/lib/auth";
import type { EstadoFormulario } from "@/lib/clientes";
import { prismaBase } from "@/lib/db";
import { gerarHash } from "@/lib/senha";

const novaLojaSchema = z.object({
  loja: z.string().trim().min(2, "Informe o nome da loja"),
  nome: z.string().trim().min(2, "Informe o nome do administrador"),
  email: z.email("E-mail inválido").transform((v) => v.toLowerCase()),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

// Cria uma loja nova com o primeiro administrador dela (sem acesso às outras lojas).
export async function criarLoja(_e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirSuperAdmin();
  const valores = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const r = novaLojaSchema.safeParse(valores);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, valores: { ...valores, senha: "" } };
  }
  if (await prismaBase.usuario.findUnique({ where: { email: r.data.email } })) {
    return { erros: { email: "Este e-mail já é usado por outro usuário." }, valores: { ...valores, senha: "" } };
  }
  const senhaHash = await gerarHash(r.data.senha);
  await prismaBase.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({ data: { nome: r.data.loja } });
    await tx.usuario.create({ data: { empresaId: empresa.id, nome: r.data.nome, email: r.data.email, senhaHash, perfil: "ADMIN" } });
  });
  revalidatePath("/sistema");
  return { mensagem: `Loja "${r.data.loja}" criada. O administrador já pode entrar com ${r.data.email}.` };
}

export async function alternarLoja(empresaId: string) {
  const eu = await exigirSuperAdmin();
  if (eu.empresaId === empresaId) return; // não bloqueia a própria loja
  const e = await prismaBase.empresa.findUnique({ where: { id: empresaId }, select: { ativa: true } });
  if (!e) return;
  await prismaBase.empresa.update({ where: { id: empresaId }, data: { ativa: !e.ativa } });
  if (e.ativa) {
    // Bloqueada: derruba as sessões abertas dos usuários dela.
    await prismaBase.sessao.deleteMany({ where: { usuario: { empresaId } } });
  }
  revalidatePath("/sistema");
}
