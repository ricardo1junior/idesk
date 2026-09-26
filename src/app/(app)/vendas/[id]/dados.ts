import { prisma } from "@/lib/db";

export async function carregarVenda(id: string) {
  return prisma.venda.findUnique({
    where: { id },
    include: {
      cliente: { include: { contatos: true } },
      vendedor: { select: { nome: true } },
      itens: { include: { aparelho: true }, orderBy: { id: "asc" } },
      pagamentos: { include: { aparelhoTroca: true } },
    },
  });
}

export type VendaCompleta = NonNullable<Awaited<ReturnType<typeof carregarVenda>>>;
