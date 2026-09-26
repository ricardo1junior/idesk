"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { resumirPrecos } from "@/lib/avaliacao-troca";
import { categoriaId, parcelarPagamento } from "@/lib/financeiro";
import { prisma } from "@/lib/db";
import { somenteDigitos } from "@/lib/documentos";
import { GARANTIA_ACESSORIO, GARANTIA_PADRAO } from "@/lib/estoque";
import { bloqueioTroca } from "@/lib/verificacao";
import { calcularTotais, vendaSchema, type TrocaEntrada } from "@/lib/vendas";

export type OpcaoVenda = {
  chave: string;
  produtoId: string;
  aparelhoId: string | null;
  descricao: string;
  detalhe: string;
  preco: number;
  disponivel: number;
};

// Busca produtos (acessórios/peças) e unidades de aparelho em estoque para a venda.
export async function buscarParaVenda(termo: string): Promise<OpcaoVenda[]> {
  await exigirUsuario("vendas");
  const q = termo.trim();
  if (q.length < 2) return [];
  const digitos = somenteDigitos(q);

  const [produtos, aparelhos] = await Promise.all([
    prisma.produto.findMany({
      where: {
        ativo: true,
        tipo: { not: "APARELHO" },
        OR: [
          { descricao: { contains: q, mode: "insensitive" } },
          { modelo: { contains: q, mode: "insensitive" } },
          { codigoBarras: q },
          { sku: { equals: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      orderBy: { descricao: "asc" },
    }),
    prisma.aparelho.findMany({
      where: {
        situacao: "EM_ESTOQUE",
        produtoId: { not: null },
        OR: [
          { modelo: { contains: q, mode: "insensitive" } },
          { produto: { descricao: { contains: q, mode: "insensitive" } } },
          { produto: { codigoBarras: q } },
          ...(digitos.length >= 4 ? [{ imei: { contains: digitos } }] : []),
          { serial: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { produto: true },
      take: 15,
      orderBy: { criadoEm: "asc" },
    }),
  ]);

  return [
    ...aparelhos.map((a) => ({
      chave: `a:${a.id}`,
      produtoId: a.produtoId!,
      aparelhoId: a.id,
      descricao: a.produto!.descricao,
      detalhe: [a.condicao === "NOVO" ? "Novo" : a.condicao.replace("SEMINOVO_", "Seminovo "), a.capacidade, a.cor, a.imei ? `IMEI ${a.imei}` : a.serial && `Série ${a.serial}`]
        .filter(Boolean)
        .join(" · "),
      preco: Number(a.produto!.precoVenda),
      disponivel: 1,
    })),
    ...produtos.map((p) => ({
      chave: `p:${p.id}`,
      produtoId: p.id,
      aparelhoId: null,
      descricao: p.descricao,
      detalhe: `${p.estoque} em estoque${p.codigoBarras ? ` · ${p.codigoBarras}` : ""}`,
      preco: Number(p.precoVenda),
      disponivel: p.estoque,
    })),
  ];
}

class ErroVenda extends Error {}

async function receberTroca(tx: Prisma.TransactionClient, troca: TrocaEntrada, valor: number) {
  // A troca entra no estoque ligada a um produto "aparelho" do mesmo modelo (criado se não existir).
  const produto =
    (await tx.produto.findFirst({ where: { tipo: "APARELHO", modelo: { equals: troca.modelo, mode: "insensitive" } } })) ??
    (await tx.produto.create({ data: { tipo: "APARELHO", descricao: `${troca.modelo} seminovo`, modelo: troca.modelo } }));

  const dados = {
    produtoId: produto.id,
    modelo: troca.modelo,
    capacidade: troca.capacidade || null,
    cor: troca.cor || null,
    condicao: troca.condicao,
    saudeBateria: troca.saudeBateria ?? null,
    custo: valor,
    situacao: "EM_ESTOQUE" as const,
    clienteId: null,
    observacoes: ["Recebido na troca", troca.observacoes].filter(Boolean).join(". "),
  };

  // Se o aparelho já passou pela loja (ex.: OS antiga), reaproveita o cadastro.
  const existente =
    (troca.imei && (await tx.aparelho.findUnique({ where: { imei: troca.imei } }))) ||
    (troca.serial && (await tx.aparelho.findUnique({ where: { serial: troca.serial.toUpperCase() } }))) ||
    null;
  if (existente && existente.situacao === "EM_ESTOQUE") throw new ErroVenda("O aparelho da troca já está no estoque da loja.");

  const aparelho = existente
    ? await tx.aparelho.update({ where: { id: existente.id }, data: dados })
    : await tx.aparelho.create({ data: { ...dados, imei: troca.imei || null, serial: troca.serial?.toUpperCase() || null } });

  await tx.movimentoEstoque.create({
    data: { produtoId: produto.id, tipo: "ENTRADA_TROCA", quantidade: 1, custoUnit: valor, referencia: `Troca IMEI ${troca.imei ?? troca.serial ?? "-"}` },
  });
  return aparelho.id;
}

export async function finalizarVenda(dados: unknown): Promise<{ erro?: string; id?: string }> {
  const usuario = await exigirUsuario("vendas");
  const r = vendaSchema.safeParse(dados);
  if (!r.success) return { erro: r.error.issues[0].message };
  const v = r.data;
  const { subtotal, total } = calcularTotais(v.itens, v.desconto);

  for (const p of v.pagamentos) {
    if (p.forma !== "TROCA" || !p.troca) continue;
    const bloqueio = await bloqueioTroca(p.troca.imei);
    if (bloqueio) return { erro: bloqueio };
  }

  try {
    const venda = await prisma.$transaction(async (tx) => {
      const criada = await tx.venda.create({
        data: {
          clienteId: v.clienteId,
          vendedorId: usuario.id,
          status: "FINALIZADA",
          subtotal,
          desconto: v.desconto,
          total,
          observacoes: v.observacoes || null,
        },
      });
      const ref = `Venda ${criada.numero}`;

      for (const item of v.itens) {
        let garantiaDias = GARANTIA_ACESSORIO;
        if (item.aparelhoId) {
          const aparelho = await tx.aparelho.findUnique({ where: { id: item.aparelhoId } });
          // updateMany com a situação no filtro evita vender a mesma unidade duas vezes.
          const baixa = await tx.aparelho.updateMany({
            where: { id: item.aparelhoId, situacao: "EM_ESTOQUE" },
            data: {
              situacao: "VENDIDO",
              clienteId: v.clienteId,
              garantiaAte: aparelho ? new Date(Date.now() + GARANTIA_PADRAO[aparelho.condicao] * 86_400_000) : null,
            },
          });
          if (baixa.count !== 1 || !aparelho) throw new ErroVenda(`${item.descricao}: aparelho não está mais disponível.`);
          garantiaDias = GARANTIA_PADRAO[aparelho.condicao];
        } else {
          const baixa = await tx.produto.updateMany({
            where: { id: item.produtoId, estoque: { gte: item.quantidade } },
            data: { estoque: { decrement: item.quantidade } },
          });
          if (baixa.count !== 1) throw new ErroVenda(`${item.descricao}: estoque insuficiente.`);
        }
        await tx.itemVenda.create({
          data: {
            vendaId: criada.id,
            produtoId: item.produtoId,
            aparelhoId: item.aparelhoId,
            descricao: item.descricao,
            quantidade: item.quantidade,
            valorUnit: item.valorUnit,
            desconto: item.desconto,
            garantiaDias,
          },
        });
        await tx.movimentoEstoque.create({
          data: { produtoId: item.produtoId, tipo: "VENDA", quantidade: -item.quantidade, custoUnit: null, referencia: ref },
        });
      }

      for (const p of v.pagamentos) {
        const aparelhoTrocaId = p.forma === "TROCA" && p.troca ? await receberTroca(tx, p.troca, p.valor) : null;
        await tx.pagamento.create({
          data: { vendaId: criada.id, forma: p.forma, valor: p.valor, parcelas: p.parcelas, aparelhoTrocaId },
        });
        // Financeiro: à vista entra no caixa; crédito, boleto e a prazo viram contas a receber.
        const categoria = await categoriaId(tx, "ENTRADA", "Vendas");
        for (const parc of parcelarPagamento(p.forma, p.valor, p.parcelas, criada.criadoEm, p.primeiroVencimento)) {
          await tx.lancamento.create({
            data: {
              tipo: "ENTRADA",
              status: parc.pago ? "PAGO" : "PENDENTE",
              descricao: `Venda #${criada.numero}`,
              valor: parc.valor,
              vencimento: parc.vencimento,
              pagoEm: parc.pago ? criada.criadoEm : null,
              forma: p.forma,
              parcela: parc.parcela,
              totalParcelas: parc.totalParcelas,
              categoriaId: categoria,
              clienteId: v.clienteId,
              vendaId: criada.id,
              usuarioId: usuario.id,
            },
          });
        }
      }
      return criada;
    });
    revalidatePath("/vendas");
    revalidatePath("/estoque");
    return { id: venda.id };
  } catch (e) {
    if (e instanceof ErroVenda) return { erro: e.message };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { erro: "IMEI ou série do aparelho da troca já está cadastrado em outro aparelho." };
    }
    throw e;
  }
}

export async function cancelarVenda(id: string): Promise<{ erro?: string }> {
  await exigirUsuario("cancelarVenda");
  try {
    await prisma.$transaction(async (tx) => {
      const venda = await tx.venda.findUniqueOrThrow({
        where: { id },
        include: { itens: true, pagamentos: { include: { aparelhoTroca: true } } },
      });
      if (venda.status === "CANCELADA") throw new ErroVenda("Venda já cancelada.");
      if (await tx.notaFiscal.count({ where: { vendaId: id, status: { in: ["AUTORIZADA", "PROCESSANDO"] } } })) {
        throw new ErroVenda("Esta venda tem nota fiscal emitida. Cancele a nota antes de cancelar a venda.");
      }
      const ref = `Cancelamento venda ${venda.numero}`;

      // O aparelho recebido na troca volta para o cliente; se já foi revendido, não dá para cancelar.
      for (const p of venda.pagamentos) {
        const a = p.aparelhoTroca;
        if (!a) continue;
        if (a.situacao !== "EM_ESTOQUE") throw new ErroVenda(`O aparelho da troca (${a.modelo}) já saiu do estoque; cancele a venda dele antes.`);
        await tx.aparelho.update({ where: { id: a.id }, data: { situacao: "DEVOLVIDO", clienteId: venda.clienteId } });
        if (a.produtoId) {
          await tx.movimentoEstoque.create({ data: { produtoId: a.produtoId, tipo: "DEVOLUCAO", quantidade: -1, referencia: ref } });
        }
      }
      for (const item of venda.itens) {
        if (item.aparelhoId) {
          await tx.aparelho.update({ where: { id: item.aparelhoId }, data: { situacao: "EM_ESTOQUE", clienteId: null, garantiaAte: null } });
        } else {
          await tx.produto.update({ where: { id: item.produtoId }, data: { estoque: { increment: item.quantidade } } });
        }
        await tx.movimentoEstoque.create({ data: { produtoId: item.produtoId, tipo: "DEVOLUCAO", quantidade: item.quantidade, referencia: ref } });
      }
      await tx.venda.update({ where: { id }, data: { status: "CANCELADA", canceladaEm: new Date() } });
      await tx.lancamento.updateMany({ where: { vendaId: id }, data: { status: "CANCELADO" } });
    });
  } catch (e) {
    if (e instanceof ErroVenda) return { erro: e.message };
    throw e;
  }
  revalidatePath(`/vendas/${id}`);
  revalidatePath("/vendas");
  revalidatePath("/estoque");
  return {};
}


// Quanto a loja já pagou em trocas e por quanto vendeu seminovos do mesmo modelo/capacidade.
export async function avaliarTroca(modelo: string, capacidade: string) {
  await exigirUsuario("vendas");
  const m = modelo.trim();
  if (m.length < 3) return { pagoEmTrocas: null, vendidoSeminovo: null };
  const filtro: Prisma.AparelhoWhereInput = {
    modelo: { equals: m, mode: "insensitive" },
    ...(capacidade.trim() ? { capacidade: { equals: capacidade.trim(), mode: "insensitive" } } : {}),
  };
  const [trocas, vendidos] = await Promise.all([
    prisma.aparelho.findMany({ where: { ...filtro, trocaEm: { isNot: null } }, select: { custo: true }, orderBy: { criadoEm: "desc" }, take: 50 }),
    prisma.itemVenda.findMany({
      where: { aparelho: { ...filtro, condicao: { not: "NOVO" } }, venda: { status: "FINALIZADA" } },
      select: { valorUnit: true, desconto: true },
      orderBy: { venda: { criadoEm: "desc" } },
      take: 50,
    }),
  ]);
  return {
    pagoEmTrocas: resumirPrecos(trocas.map((t) => Number(t.custo ?? 0))),
    vendidoSeminovo: resumirPrecos(vendidos.map((i) => Number(i.valorUnit) - Number(i.desconto))),
  };
}
