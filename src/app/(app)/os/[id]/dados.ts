import { prisma } from "@/lib/db";

export async function carregarOS(id: string) {
  return prisma.ordemServico.findUnique({
    where: { id },
    include: {
      cliente: true,
      aparelho: true,
      itens: { orderBy: { id: "asc" } },
      historico: { orderBy: { criadoEm: "desc" } },
    },
  });
}

export type OSCompleta = NonNullable<Awaited<ReturnType<typeof carregarOS>>>;
