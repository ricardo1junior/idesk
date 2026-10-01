import "server-only";
import { cache } from "react";
import { empresaAtualId, prisma } from "@/lib/db";

/** Dados da loja logada (sem o arquivo do logo). Memorizado por requisição. */
export const empresaAtual = cache(async () => {
  const id = await empresaAtualId();
  return prisma.empresa.findUniqueOrThrow({ where: { id }, omit: { logo: true } });
});

/** Endereço do logo da loja, ou null. A versão no endereço renova o cache quando o logo muda. */
export function urlLogo(empresa: { id: string; logoTipo: string | null; logoVersao: number }) {
  return empresa.logoTipo ? `/logo/${empresa.id}?v=${empresa.logoVersao}` : null;
}
