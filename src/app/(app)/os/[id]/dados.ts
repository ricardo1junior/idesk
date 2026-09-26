import { prisma } from "@/lib/db";

export async function carregarOS(id: string) {
  return prisma.ordemServico.findUnique({
    where: { id },
    include: {
      cliente: { include: { contatos: true } },
      aparelho: true,
      itens: { orderBy: { id: "asc" } },
      historico: { orderBy: { criadoEm: "desc" } },
      fotos: { select: { id: true, tipo: true, legenda: true }, orderBy: { criadoEm: "asc" } },
      lancamentos: { where: { status: { not: "CANCELADO" } }, orderBy: { vencimento: "asc" } },
    },
  });
}

export type OSCompleta = NonNullable<Awaited<ReturnType<typeof carregarOS>>>;
