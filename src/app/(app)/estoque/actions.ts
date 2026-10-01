"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { faltandoNoEstoque, produtosDoCatalogo } from "@/lib/catalogo-apple";
import type { EstadoFormulario } from "@/lib/clientes";
import { prisma } from "@/lib/db";
import { aparelhoSchema, paraNumero, produtoSchema } from "@/lib/estoque";
import { entradaComCustoMedio } from "@/lib/movimentos";

function errosDe(issues: { path: PropertyKey[]; message: string }[]) {
  const erros: Record<string, string> = {};
  for (const i of issues) erros[String(i.path[0])] ??= i.message;
  return erros;
}

export async function salvarProduto(id: string | null, _e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirUsuario("editarProdutos");
  const valores = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const r = produtoSchema.safeParse(valores);
  if (!r.success) return { erros: errosDe(r.error.issues), valores };

  const { compativelCom, ...dados } = r.data;
  const data = {
    ...dados,
    compativelCom: compativelCom ? compativelCom.split(",").map((m) => m.trim()).filter(Boolean) : [],
  };
  let produtoId = id;
  try {
    if (id) await prisma.produto.update({ where: { id }, data });
    else produtoId = (await prisma.produto.create({ data })).id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { erros: { codigoBarras: "Código de barras ou SKU já usado em outro produto" }, valores };
    }
    throw e;
  }
  revalidatePath("/estoque");
  redirect(`/estoque/produtos/${produtoId}?salvo=1`);
}

// Entrada ou ajuste de quantidade para produtos sem IMEI (acessórios e peças).
export async function movimentarEstoque(produtoId: string, _e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirUsuario("editarProdutos");
  const valores = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const tipo = valores.tipo === "AJUSTE" ? "AJUSTE" : "ENTRADA_NOTA";
  const quantidade = Number(valores.quantidade);
  const custo = paraNumero(valores.custoUnit);
  const referencia = valores.referencia?.trim() || null;
  if (!Number.isInteger(quantidade) || !quantidade) return { erros: { quantidade: "Informe a quantidade (número inteiro)" }, valores };
  if (tipo === "ENTRADA_NOTA" && quantidade < 0) return { erros: { quantidade: "Entrada deve ser positiva" }, valores };
  if (!Number.isFinite(custo) || custo < 0) return { erros: { custoUnit: "Valor inválido" }, valores };

  const erro = await prisma.$transaction(async (tx) => {
    const p = await tx.produto.findFirst({ where: { id: produtoId }, select: { tipo: true, estoque: true } });
    if (!p) return "Produto não encontrado.";
    if (p.tipo === "APARELHO") return "Aparelhos entram no estoque um a um, com IMEI/série.";
    if (!(await entradaComCustoMedio(tx, produtoId, quantidade, custo, tipo, referencia))) {
      return `Estoque atual é ${p.estoque}; não dá para retirar ${-quantidade}.`;
    }
    return null;
  });
  if (erro) return { erros: { quantidade: erro }, valores };
  revalidatePath(`/estoque/produtos/${produtoId}`);
  revalidatePath("/estoque");
  return { mensagem: "Estoque atualizado." };
}

// Cadastra uma unidade de aparelho (com IMEI/série) no estoque da loja.
export async function entradaAparelho(produtoId: string, _e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirUsuario("editarProdutos");
  const valores = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const r = aparelhoSchema.safeParse(valores);
  if (!r.success) return { erros: errosDe(r.error.issues), valores };
  if (!r.data.imei && !r.data.serial) return { erros: { imei: "Informe o IMEI ou o número de série" }, valores };
  const produto = await prisma.produto.findFirst({ where: { id: produtoId }, select: { tipo: true } });
  if (!produto) return { erros: { geral: "Produto não encontrado." }, valores };
  if (produto.tipo !== "APARELHO") return { erros: { geral: "Só produtos do tipo aparelho recebem unidades com IMEI/série." }, valores };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.aparelho.create({
        data: {
          ...r.data,
          saudeBateria: r.data.saudeBateria ? Number(r.data.saudeBateria) : null,
          produtoId,
          situacao: "EM_ESTOQUE",
        },
      });
      await tx.movimentoEstoque.create({
        data: {
          produtoId,
          tipo: "ENTRADA_NOTA",
          quantidade: 1,
          custoUnit: r.data.custo,
          referencia: `IMEI ${r.data.imei ?? r.data.serial}`,
        },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { erros: { imei: "IMEI ou número de série já cadastrado" }, valores };
    }
    throw e;
  }
  revalidatePath(`/estoque/produtos/${produtoId}`);
  revalidatePath("/estoque");
  return { mensagem: "Aparelho adicionado ao estoque." };
}

// Cria um produto (preço zerado) para cada modelo do catálogo Apple que ainda não está no estoque.
export async function importarCatalogoApple(): Promise<{ criados: number; jaExistiam: number }> {
  await exigirUsuario("editarProdutos");
  const catalogo = produtosDoCatalogo();
  const existentes = await prisma.produto.findMany({ select: { modelo: true, descricao: true } });
  const novos = faltandoNoEstoque(catalogo, existentes);
  if (novos.length) await prisma.produto.createMany({ data: novos.map((p) => ({ ...p, marca: "Apple" })) });
  revalidatePath("/estoque");
  return { criados: novos.length, jaExistiam: catalogo.length - novos.length };
}
