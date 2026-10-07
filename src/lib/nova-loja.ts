import "server-only";
import { Prisma } from "@prisma/client";
import { iniciarCarteira } from "./carteira";
import { prismaBase } from "./db";
import { gerarHash } from "./senha";

/**
 * Cria uma loja com o primeiro administrador dela (sem acesso às outras lojas) e o crédito de boas-vindas.
 * Devolve null quando o e-mail já é usado por outro usuário.
 */
export async function criarLojaComAdmin(d: { loja: string; nome: string; email: string; senha: string }) {
  if (await prismaBase.usuario.findUnique({ where: { email: d.email }, select: { id: true } })) return null;
  const senhaHash = await gerarHash(d.senha);
  try {
    const criado = await prismaBase.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({ data: { nome: d.loja } });
      const usuario = await tx.usuario.create({ data: { empresaId: empresa.id, nome: d.nome, email: d.email, senhaHash, perfil: "ADMIN" } });
      return { empresaId: empresa.id, usuarioId: usuario.id };
    });
    await iniciarCarteira(criado.empresaId);
    return criado;
  } catch (e) {
    // Dois cadastros com o mesmo e-mail ao mesmo tempo.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return null;
    throw e;
  }
}

/** Cadastro de loja pela tela pública: ligado com CADASTRO_ABERTO="sim". */
export const cadastroAberto = () => process.env.CADASTRO_ABERTO?.trim().toLowerCase() === "sim";
