import type { Tx } from "@/lib/db";
import { Prisma, type TipoMovimento } from "@prisma/client";

// Entrada de itens sem IMEI (acessórios e peças) atualizando o custo médio ponderado.
export async function entradaComCustoMedio(
  tx: Tx,
  produtoId: string,
  quantidade: number,
  custoUnit: number,
  tipo: TipoMovimento,
  referencia: string | null,
  notaEntradaId?: string,
) {
  const p = await tx.produto.findUniqueOrThrow({ where: { id: produtoId } });
  let precoCusto = p.precoCusto;
  if (quantidade > 0 && custoUnit > 0) {
    const saldo = Math.max(p.estoque, 0);
    precoCusto = p.precoCusto
      .mul(saldo)
      .add(new Prisma.Decimal(custoUnit).mul(quantidade))
      .div(saldo + quantidade)
      .toDecimalPlaces(2);
  }
  await tx.produto.update({ where: { id: produtoId }, data: { estoque: { increment: quantidade }, precoCusto } });
  await tx.movimentoEstoque.create({
    data: { produtoId, tipo, quantidade, custoUnit: custoUnit > 0 ? custoUnit : null, referencia, notaEntradaId },
  });
}
