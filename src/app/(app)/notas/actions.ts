"use server";

import { Prisma, type TipoProduto } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import { empresaAtualId, prisma } from "@/lib/db";
import { categoriaId } from "@/lib/financeiro";
import { entradaComCustoMedio } from "@/lib/movimentos";
import { ErroXml, lerXmlNFe, type NotaLida } from "@/lib/nfe/ler-xml";

export type Sugestao = { produtoId: string; descricao: string; tipo: TipoProduto; fator: number; origem: "vinculo" | "ean" } | null;

export type Conferencia = {
  erro?: string;
  nota?: Omit<NotaLida, "emissao" | "duplicatas"> & { emissao: string; duplicatas: { numero: string; vencimento: string; valor: number }[] };
  sugestoes?: Sugestao[];
  fornecedorCadastrado?: boolean;
};

// Lê o XML e sugere o produto do cadastro para cada item (pelo vínculo salvo ou pelo código de barras).
export async function conferirXml(xml: string): Promise<Conferencia> {
  await exigirUsuario("notasFiscais");
  let nota: NotaLida;
  try {
    nota = lerXmlNFe(xml);
  } catch (e) {
    return { erro: e instanceof ErroXml ? e.message : "Não foi possível ler o XML." };
  }
  if (await prisma.notaEntrada.findFirst({ where: { chave: nota.chave } })) {
    return { erro: `A nota ${nota.numero} (chave ${nota.chave}) já foi importada.` };
  }
  const fornecedor = await prisma.fornecedor.findFirst({ where: { cnpj: nota.emitente.cnpj }, select: { id: true } });
  // Duas consultas para a nota inteira (em vez de uma ou duas por item).
  const eans = nota.itens.map((i) => i.ean).filter((e): e is string => !!e);
  const [vinculos, porEan] = await Promise.all([
    fornecedor
      ? prisma.vinculoProdutoFornecedor.findMany({
          where: { fornecedorId: fornecedor.id, codigoFornecedor: { in: nota.itens.map((i) => i.codigo) } },
          include: { produto: { select: { descricao: true, tipo: true } } },
        })
      : [],
    eans.length ? prisma.produto.findMany({ where: { codigoBarras: { in: eans } }, select: { id: true, descricao: true, tipo: true, codigoBarras: true } }) : [],
  ]);
  const sugestoes: Sugestao[] = nota.itens.map((item) => {
    const v = vinculos.find((x) => x.codigoFornecedor === item.codigo);
    if (v) return { produtoId: v.produtoId, descricao: v.produto.descricao, tipo: v.produto.tipo, fator: v.fatorConversao, origem: "vinculo" };
    const p = item.ean ? porEan.find((x) => x.codigoBarras === item.ean) : undefined;
    return p ? { produtoId: p.id, descricao: p.descricao, tipo: p.tipo, fator: 1, origem: "ean" } : null;
  });
  return {
    nota: {
      ...nota,
      emissao: nota.emissao.toISOString(),
      duplicatas: nota.duplicatas.map((d) => ({ ...d, vencimento: d.vencimento.toISOString() })),
    },
    sugestoes,
    fornecedorCadastrado: !!fornecedor,
  };
}

export async function buscarProdutosNota(termo: string) {
  await exigirUsuario("notasFiscais");
  if (termo.trim().length < 2) return [];
  return prisma.produto.findMany({
    where: {
      ativo: true,
      OR: [
        { descricao: { contains: termo.trim(), mode: "insensitive" } },
        { modelo: { contains: termo.trim(), mode: "insensitive" } },
        { codigoBarras: termo.trim() },
        { sku: { equals: termo.trim(), mode: "insensitive" } },
      ],
    },
    select: { id: true, descricao: true, tipo: true },
    take: 10,
    orderBy: { descricao: "asc" },
  });
}

const mapeamentoSchema = z.array(
  z.object({
    numero: z.number().int(),
    acao: z.enum(["vincular", "novo", "ignorar"]),
    produtoId: z.string().nullable(),
    novoTipo: z.enum(["APARELHO", "ACESSORIO", "PECA"]),
    fator: z.number().int().min(1).max(1000),
    precoVenda: z.number().min(0),
    imeis: z.array(z.string()),
  }),
);

class ErroImportacao extends Error {}

export async function importarNota(xml: string, mapeamentos: unknown): Promise<{ erro?: string; id?: string }> {
  const usuario = await exigirUsuario("notasFiscais");
  let nota: NotaLida;
  try {
    nota = lerXmlNFe(xml);
  } catch (e) {
    return { erro: e instanceof ErroXml ? e.message : "Não foi possível ler o XML." };
  }
  const m = mapeamentoSchema.safeParse(mapeamentos);
  if (!m.success) return { erro: "Conferência inválida. Recarregue a página." };
  const porNumero = new Map(m.data.map((x) => [x.numero, x]));

  try {
    const id = await prisma.$transaction(
      async (tx) => {
        const e = nota.emitente;
        const fornecedor = await tx.fornecedor.upsert({
          where: { empresaId_cnpj: { empresaId: await empresaAtualId(), cnpj: e.cnpj } },
          create: { cnpj: e.cnpj, razaoSocial: e.razaoSocial, nomeFantasia: e.nomeFantasia, inscricaoEstadual: e.ie, telefone: e.telefone, cidade: e.cidade, uf: e.uf },
          update: { razaoSocial: e.razaoSocial, nomeFantasia: e.nomeFantasia ?? undefined },
        });
        const registro = await tx.notaEntrada.create({
          data: {
            chave: nota.chave,
            numero: nota.numero,
            serie: nota.serie,
            emissao: nota.emissao,
            valorTotal: nota.valorTotal,
            fornecedorId: fornecedor.id,
            xml,
            usuarioId: usuario.id,
          },
        });
        const ref = `NF ${nota.numero} ${fornecedor.nomeFantasia ?? fornecedor.razaoSocial}`.slice(0, 120);

        for (const item of nota.itens) {
          const map = porNumero.get(item.numero);
          if (!map || map.acao === "ignorar") continue;

          let produtoId = map.produtoId;
          if (map.acao === "novo" || !produtoId) {
            const codigoLivre = item.ean && !(await tx.produto.findFirst({ where: { codigoBarras: item.ean } }));
            produtoId = (
              await tx.produto.create({
                data: {
                  tipo: map.novoTipo,
                  descricao: item.descricao,
                  modelo: map.novoTipo === "APARELHO" ? item.descricao : null,
                  codigoBarras: codigoLivre ? item.ean : null,
                  ncm: item.ncm,
                  precoVenda: map.precoVenda,
                },
              })
            ).id;
          }
          const produto = await tx.produto.findUniqueOrThrow({ where: { id: produtoId } });
          await tx.vinculoProdutoFornecedor.upsert({
            where: { fornecedorId_codigoFornecedor: { fornecedorId: fornecedor.id, codigoFornecedor: item.codigo } },
            create: { fornecedorId: fornecedor.id, codigoFornecedor: item.codigo, produtoId, fatorConversao: map.fator },
            update: { produtoId, fatorConversao: map.fator },
          });
          if (!produto.ncm && item.ncm) await tx.produto.update({ where: { id: produtoId }, data: { ncm: item.ncm } });

          const unidades = Math.round(item.quantidade * map.fator);
          const custoUnit = Math.round((item.custoUnitario / map.fator) * 100) / 100;

          if (produto.tipo === "APARELHO") {
            const imeis = [...new Set(map.imeis.map((i) => i.trim()).filter(Boolean))];
            if (imeis.length !== unidades || imeis.some((i) => !/^\d{15}$/.test(i))) {
              throw new ErroImportacao(`Item ${item.numero} (${item.descricao}): informe ${unidades} IMEI(s) de 15 dígitos, um por linha.`);
            }
            for (const imei of imeis) {
              if (await tx.aparelho.findFirst({ where: { imei } })) throw new ErroImportacao(`IMEI ${imei} já está cadastrado.`);
              await tx.aparelho.create({
                data: { produtoId, modelo: produto.modelo ?? produto.descricao, imei, condicao: "NOVO", situacao: "EM_ESTOQUE", custo: custoUnit },
              });
            }
            await tx.movimentoEstoque.create({ data: { produtoId, tipo: "ENTRADA_NOTA", quantidade: unidades, custoUnit, referencia: ref, notaEntradaId: registro.id } });
            await tx.produto.update({ where: { id: produtoId }, data: { precoCusto: custoUnit } });
          } else {
            await entradaComCustoMedio(tx, produtoId, unidades, custoUnit, "ENTRADA_NOTA", ref, registro.id);
          }
        }

        // Contas a pagar: uma por duplicata, ou uma única no valor da nota.
        const categoria = await categoriaId(tx, "SAIDA", "Compra de mercadoria");
        const parcelas = nota.duplicatas.length ? nota.duplicatas : [{ numero: "", vencimento: nota.emissao, valor: nota.valorTotal }];
        for (const [i, d] of parcelas.entries()) {
          await tx.lancamento.create({
            data: {
              tipo: "SAIDA",
              status: "PENDENTE",
              descricao: `NF ${nota.numero}${d.numero ? ` dup. ${d.numero}` : ""}`,
              valor: d.valor,
              vencimento: d.vencimento,
              parcela: parcelas.length > 1 ? i + 1 : null,
              totalParcelas: parcelas.length > 1 ? parcelas.length : null,
              categoriaId: categoria,
              fornecedorId: fornecedor.id,
              notaEntradaId: registro.id,
              usuarioId: usuario.id,
            },
          });
        }
        return registro.id;
      },
      { timeout: 30_000 },
    );
    revalidatePath("/notas");
    revalidatePath("/estoque");
    revalidatePath("/financeiro");
    return { id };
  } catch (e) {
    if (e instanceof ErroImportacao) return { erro: e.message };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { erro: "Esta nota já foi importada." };
    throw e;
  }
}
