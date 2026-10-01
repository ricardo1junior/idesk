"use server";

import type { Tx } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { resumirPrecos } from "@/lib/avaliacao-troca";
import { categoriaId, parcelarPagamento } from "@/lib/financeiro";
import { ErroSomenteConsulta, prisma } from "@/lib/db";
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
  codigos: string[]; // código de barras, SKU, IMEI ou série: o leitor adiciona direto quando bate exato
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
      codigos: [a.imei, a.imei2, a.serial].filter((c): c is string => !!c),
    })),
    ...produtos.map((p) => ({
      chave: `p:${p.id}`,
      produtoId: p.id,
      aparelhoId: null,
      descricao: p.descricao,
      detalhe: `${p.estoque} em estoque${p.codigoBarras ? ` · ${p.codigoBarras}` : ""}`,
      preco: Number(p.precoVenda),
      disponivel: p.estoque,
      codigos: [p.codigoBarras, p.sku].filter((c): c is string => !!c),
    })),
  ];
}

class ErroVenda extends Error {}

async function receberTroca(tx: Tx, troca: TrocaEntrada, valor: number) {
  // A troca entra no estoque ligada a um produto "aparelho" do mesmo modelo (criado se não existir).
  const produto =
    (await tx.produto.findFirst({ where: { tipo: "APARELHO", modelo: { equals: troca.modelo, mode: "insensitive" } }, select: { id: true } })) ??
    (await tx.produto.create({ data: { tipo: "APARELHO", descricao: `${troca.modelo} seminovo`, modelo: troca.modelo }, select: { id: true } }));

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

  // Se o aparelho já passou pela loja (ex.: OS antiga ou troca anterior), reaproveita o cadastro.
  const serial = troca.serial?.toUpperCase() || null;
  const existente = troca.imei || serial
    ? await tx.aparelho.findFirst({
        where: { OR: [...(troca.imei ? [{ imei: troca.imei }] : []), ...(serial ? [{ serial }] : [])] },
        select: { id: true },
      })
    : null;

  let aparelhoId: string;
  if (existente) {
    // Filtro pela situação: o mesmo aparelho não entra duas vezes no estoque (duas vendas simultâneas).
    const r = await tx.aparelho.updateMany({ where: { id: existente.id, situacao: { not: "EM_ESTOQUE" } }, data: dados });
    if (r.count !== 1) throw new ErroVenda("O aparelho da troca já está no estoque da loja.");
    aparelhoId = existente.id;
  } else {
    aparelhoId = (await tx.aparelho.create({ data: { ...dados, imei: troca.imei || null, serial }, select: { id: true } })).id;
  }

  await tx.movimentoEstoque.create({
    data: { produtoId: produto.id, tipo: "ENTRADA_TROCA", quantidade: 1, custoUnit: valor, referencia: `Troca IMEI ${troca.imei ?? troca.serial ?? "-"}` },
  });
  return aparelhoId;
}

// IMEI/série repetido é o único conflito de chave única esperado numa venda.
function conflitoDeImei(e: unknown) {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  const alvo = e.meta?.target;
  return /imei|serial/i.test(Array.isArray(alvo) ? alvo.join(",") : String(alvo ?? ""));
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
      // Ids vindos do navegador: confere que são desta loja.
      if (v.clienteId && !(await tx.cliente.findFirst({ where: { id: v.clienteId }, select: { id: true } }))) {
        throw new ErroVenda("Cliente não encontrado.");
      }
      const idsAparelhos = v.itens.flatMap((i) => (i.aparelhoId ? [i.aparelhoId] : []));
      const aparelhos = new Map(
        idsAparelhos.length
          ? (await tx.aparelho.findMany({ where: { id: { in: idsAparelhos } }, select: { id: true, condicao: true, produtoId: true } })).map((a) => [a.id, a])
          : [],
      );
      const categoria = await categoriaId(tx, "ENTRADA", "Vendas");

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
        select: { id: true, numero: true, criadoEm: true },
      });
      const ref = `Venda ${criada.numero}`;

      const itens: Prisma.ItemVendaCreateManyInput[] = [];
      for (const item of v.itens) {
        let garantiaDias = GARANTIA_ACESSORIO;
        let produtoId = item.produtoId;
        if (item.aparelhoId) {
          const aparelho = aparelhos.get(item.aparelhoId);
          if (!aparelho?.produtoId) throw new ErroVenda(`${item.descricao}: aparelho não está mais disponível.`);
          // O produto do item é sempre o do próprio aparelho.
          produtoId = aparelho.produtoId;
          garantiaDias = GARANTIA_PADRAO[aparelho.condicao];
          // updateMany com a situação no filtro evita vender a mesma unidade duas vezes.
          const baixa = await tx.aparelho.updateMany({
            where: { id: item.aparelhoId, situacao: "EM_ESTOQUE" },
            data: { situacao: "VENDIDO", clienteId: v.clienteId, garantiaAte: new Date(Date.now() + garantiaDias * 86_400_000) },
          });
          if (baixa.count !== 1) throw new ErroVenda(`${item.descricao}: aparelho não está mais disponível.`);
        } else {
          const baixa = await tx.produto.updateMany({
            where: { id: item.produtoId, tipo: { not: "APARELHO" }, estoque: { gte: item.quantidade } },
            data: { estoque: { decrement: item.quantidade } },
          });
          if (baixa.count !== 1) throw new ErroVenda(`${item.descricao}: estoque insuficiente.`);
        }
        itens.push({
          vendaId: criada.id,
          produtoId,
          aparelhoId: item.aparelhoId,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valorUnit: item.valorUnit,
          desconto: item.desconto,
          garantiaDias,
        });
      }
      await tx.itemVenda.createMany({ data: itens });
      await tx.movimentoEstoque.createMany({
        data: v.itens.map((item, n) => ({ produtoId: itens[n].produtoId, tipo: "VENDA" as const, quantidade: -item.quantidade, custoUnit: null, referencia: ref })),
      });

      const pagamentos: Prisma.PagamentoCreateManyInput[] = [];
      const lancamentos: Prisma.LancamentoCreateManyInput[] = [];
      for (const p of v.pagamentos) {
        const aparelhoTrocaId = p.forma === "TROCA" && p.troca ? await receberTroca(tx, p.troca, p.valor) : null;
        pagamentos.push({ vendaId: criada.id, forma: p.forma, valor: p.valor, parcelas: p.parcelas, aparelhoTrocaId });
        // Financeiro: à vista entra no caixa; crédito, boleto e a prazo viram contas a receber.
        for (const parc of parcelarPagamento(p.forma, p.valor, p.parcelas, criada.criadoEm, p.primeiroVencimento)) {
          lancamentos.push({
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
          });
        }
      }
      if (pagamentos.length) await tx.pagamento.createMany({ data: pagamentos });
      if (lancamentos.length) await tx.lancamento.createMany({ data: lancamentos });
      return criada;
    });
    revalidatePath("/vendas");
    revalidatePath("/estoque");
    return { id: venda.id };
  } catch (e) {
    if (e instanceof ErroVenda || e instanceof ErroSomenteConsulta) return { erro: e.message };
    if (conflitoDeImei(e)) return { erro: "IMEI ou série do aparelho da troca já está cadastrado em outro aparelho." };
    throw e;
  }
}

export async function cancelarVenda(id: string): Promise<{ erro?: string }> {
  const usuario = await exigirUsuario("cancelarVenda");
  try {
    await prisma.$transaction(async (tx) => {
      if (await tx.notaFiscal.count({ where: { vendaId: id, status: { in: ["AUTORIZADA", "PROCESSANDO"] } } })) {
        throw new ErroVenda("Esta venda tem nota fiscal emitida. Cancele a nota antes de cancelar a venda.");
      }
      const agora = new Date();
      // Marca como cancelada antes de devolver o estoque: dois cancelamentos simultâneos não devolvem duas vezes.
      const marcada = await tx.venda.updateMany({ where: { id, status: "FINALIZADA" }, data: { status: "CANCELADA", canceladaEm: agora } });
      if (marcada.count !== 1) throw new ErroVenda("Venda já cancelada.");
      const venda = await tx.venda.findUniqueOrThrow({
        where: { id },
        select: {
          numero: true,
          criadoEm: true,
          clienteId: true,
          itens: { select: { produtoId: true, aparelhoId: true, quantidade: true } },
          pagamentos: { select: { aparelhoTroca: { select: { id: true, modelo: true, produtoId: true } } } },
        },
      });
      const ref = `Cancelamento venda ${venda.numero}`;
      const movimentos: Prisma.MovimentoEstoqueCreateManyInput[] = [];

      // O aparelho recebido na troca volta para o cliente; se já foi revendido, não dá para cancelar.
      for (const { aparelhoTroca: a } of venda.pagamentos) {
        if (!a) continue;
        // O mesmo aparelho pode ter voltado depois em outra troca: aí ele pertence àquela venda.
        if (await tx.pagamento.count({ where: { aparelhoTrocaId: a.id, vendaId: { not: id }, venda: { status: "FINALIZADA", criadoEm: { gt: venda.criadoEm } } } })) {
          throw new ErroVenda(`O aparelho da troca (${a.modelo}) foi recebido de novo em outra venda; cancele aquela venda antes.`);
        }
        const devolvido = await tx.aparelho.updateMany({ where: { id: a.id, situacao: "EM_ESTOQUE" }, data: { situacao: "DEVOLVIDO", clienteId: venda.clienteId } });
        if (devolvido.count !== 1) throw new ErroVenda(`O aparelho da troca (${a.modelo}) já saiu do estoque; cancele a venda dele antes.`);
        if (a.produtoId) movimentos.push({ produtoId: a.produtoId, tipo: "DEVOLUCAO", quantidade: -1, referencia: ref });
      }
      const aparelhos = venda.itens.flatMap((i) => (i.aparelhoId ? [i.aparelhoId] : []));
      if (aparelhos.length) {
        await tx.aparelho.updateMany({ where: { id: { in: aparelhos } }, data: { situacao: "EM_ESTOQUE", clienteId: null, garantiaAte: null } });
      }
      for (const item of venda.itens) {
        if (!item.aparelhoId) await tx.produto.update({ where: { id: item.produtoId }, data: { estoque: { increment: item.quantidade } } });
        movimentos.push({ produtoId: item.produtoId, tipo: "DEVOLUCAO", quantidade: item.quantidade, referencia: ref });
      }
      if (movimentos.length) await tx.movimentoEstoque.createMany({ data: movimentos });

      // Financeiro: o que ainda não entrou é cancelado; o que já entrou no caixa sai como estorno,
      // para o histórico do período continuar batendo.
      await tx.lancamento.updateMany({ where: { vendaId: id, status: "PENDENTE" }, data: { status: "CANCELADO" } });
      const recebidos = await tx.lancamento.findMany({
        where: { vendaId: id, tipo: "ENTRADA", status: "PAGO" },
        select: { valor: true, forma: true },
      });
      if (recebidos.length) {
        const categoria = await categoriaId(tx, "SAIDA", "Estorno de vendas");
        await tx.lancamento.createMany({
          data: recebidos.map((l) => ({
            tipo: "SAIDA" as const,
            status: "PAGO" as const,
            descricao: `Estorno da venda #${venda.numero}`,
            valor: l.valor,
            vencimento: agora,
            pagoEm: agora,
            forma: l.forma,
            categoriaId: categoria,
            clienteId: venda.clienteId,
            vendaId: id,
            usuarioId: usuario.id,
          })),
        });
      }
    });
  } catch (e) {
    if (e instanceof ErroVenda || e instanceof ErroSomenteConsulta) return { erro: e.message };
    throw e;
  }
  revalidatePath(`/vendas/${id}`);
  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath("/financeiro");
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
    prisma.aparelho.findMany({ where: { ...filtro, trocaEm: { some: {} } }, select: { custo: true }, orderBy: { criadoEm: "desc" }, take: 50 }),
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
