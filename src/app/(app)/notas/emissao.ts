"use server";

import type { ModeloNota } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import type { EstadoFormulario } from "@/lib/clientes";
import { cnpjValido, somenteDigitos } from "@/lib/documentos";
import { criptografar } from "@/lib/cripto";
import { empresaAtualId, prisma } from "@/lib/db";
import { ErroNota, montarNota } from "@/lib/nfe/emissao";
import { horaLocal } from "@/lib/tempo";
import { cancelarNotaFocus, consultarNota, enviarNota, SEM_RESPOSTA } from "@/lib/nfe/focus";

export async function emitirNota(vendaId: string, modelo: ModeloNota): Promise<{ erro?: string }> {
  const usuario = await exigirUsuario("emitirNota");
  const empresa = await prisma.empresaFiscal.findFirst();
  if (!empresa) return { erro: "Preencha os dados fiscais da empresa em Notas fiscais › Dados fiscais da empresa." };
  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { cliente: true, itens: { include: { produto: true, aparelho: true }, orderBy: { id: "asc" } }, pagamentos: true, notas: true },
  });
  if (!venda) return { erro: "Venda não encontrada." };
  if (venda.status !== "FINALIZADA") return { erro: "Só é possível emitir nota de venda finalizada." };
  if (venda.notas.some((n) => n.status === "AUTORIZADA" || n.status === "PROCESSANDO")) return { erro: "Esta venda já tem nota emitida ou em processamento." };

  let dados;
  try {
    dados = montarNota(
      modelo,
      { ...empresa, icmsAliquota: Number(empresa.icmsAliquota) },
      {
        numero: venda.numero,
        criadoEm: venda.criadoEm,
        desconto: Number(venda.desconto),
        cliente: venda.cliente,
        itens: venda.itens.map((i) => ({
          codigo: i.produto.sku ?? i.produto.codigoBarras ?? i.produto.id.slice(-10),
          descricao: i.descricao,
          ncm: i.produto.ncm,
          ean: i.produto.codigoBarras && /^\d{8,14}$/.test(i.produto.codigoBarras) ? i.produto.codigoBarras : null,
          unidade: i.produto.unidade,
          quantidade: i.quantidade,
          valorUnit: Number(i.valorUnit),
          desconto: Number(i.desconto),
          imei: i.aparelho?.imei ?? null,
          serial: i.aparelho?.serial ?? null,
        })),
        pagamentos: venda.pagamentos.map((p) => ({ forma: p.forma, valor: Number(p.valor) })),
      },
    );
  } catch (e) {
    if (e instanceof ErroNota) return { erro: e.message };
    throw e;
  }

  const referencia = `venda${venda.numero}-${modelo.toLowerCase()}-${Date.now().toString(36)}`;
  // Clique duplo ou duas abas: só uma emissão por venda de cada vez.
  const nota = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`nota:${vendaId}`}))`;
    if (await tx.notaFiscal.findFirst({ where: { vendaId, status: { in: ["AUTORIZADA", "PROCESSANDO"] } }, select: { id: true } })) return null;
    return tx.notaFiscal.create({ data: { referencia, modelo, ambiente: empresa.ambiente, vendaId, usuarioId: usuario.id } });
  });
  if (!nota) return { erro: "Esta venda já tem nota emitida ou em processamento." };
  const r = await enviarNota(empresa.ambiente, modelo, referencia, dados);
  // Sem resposta, a nota pode ter sido recebida: fica "em processamento" até consultar, para não emitir duas.
  await prisma.notaFiscal.update({ where: { id: nota.id }, data: r.mensagem === SEM_RESPOSTA ? { status: "PROCESSANDO", mensagem: r.mensagem } : r });
  revalidatePath(`/vendas/${vendaId}`);
  revalidatePath("/notas");
  return r.status === "ERRO" || r.status === "REJEITADA" ? { erro: r.mensagem ?? "Nota não autorizada." } : {};
}

export async function atualizarNota(id: string): Promise<{ erro?: string }> {
  await exigirUsuario("emitirNota");
  const nota = await prisma.notaFiscal.findUnique({ where: { id } });
  if (!nota) return { erro: "Nota não encontrada." };
  const r = await consultarNota(nota.ambiente, nota.modelo, nota.referencia);
  if (r.status === "ERRO") {
    // A Focus não conhece a referência: a nota nunca chegou lá e pode ser emitida de novo.
    if (nota.status === "PROCESSANDO" && nota.mensagem === SEM_RESPOSTA && /não encontrad|not found|404/i.test(r.mensagem ?? "")) {
      await prisma.notaFiscal.update({ where: { id }, data: { status: "ERRO", mensagem: "A nota não chegou à Focus NFe. Emita de novo." } });
      revalidatePath(`/vendas/${nota.vendaId}`);
    }
    return { erro: r.mensagem };
  }
  await prisma.notaFiscal.update({ where: { id }, data: r });
  revalidatePath(`/vendas/${nota.vendaId}`);
  revalidatePath("/notas");
  return {};
}

export async function cancelarNota(id: string, justificativa: string): Promise<{ erro?: string }> {
  await exigirUsuario("cancelarVenda");
  const texto = justificativa.trim();
  if (texto.length < 15 || texto.length > 255) return { erro: "A justificativa precisa ter de 15 a 255 caracteres." };
  const nota = await prisma.notaFiscal.findUnique({ where: { id } });
  if (!nota || nota.status !== "AUTORIZADA") return { erro: "Só é possível cancelar nota autorizada." };
  const r = await cancelarNotaFocus(nota.ambiente, nota.modelo, nota.referencia, texto);
  if (r.status !== "CANCELADA") return { erro: r.mensagem ?? "A SEFAZ não aceitou o cancelamento." };
  await prisma.notaFiscal.update({ where: { id }, data: { status: "CANCELADA", canceladaEm: new Date(), mensagem: `Cancelada: ${texto}` } });
  revalidatePath(`/vendas/${nota.vendaId}`);
  revalidatePath("/notas");
  return {};
}

const empresaSchema = z.object({
  cnpj: z.string().transform(somenteDigitos).refine(cnpjValido, "CNPJ inválido"),
  razaoSocial: z.string().trim().min(2, "Informe a razão social"),
  nomeFantasia: z.string().trim().transform((v) => v || null),
  inscricaoEstadual: z.string().trim().transform((v) => v || null),
  uf: z.string().trim().toUpperCase().length(2, "UF com 2 letras"),
  regime: z.enum(["SIMPLES_NACIONAL", "SIMPLES_EXCESSO", "NORMAL", "MEI"]),
  ambiente: z.enum(["HOMOLOGACAO", "PRODUCAO"]),
  icmsSituacao: z.string().trim().regex(/^\d{2,3}$/, "Código de 2 ou 3 dígitos"),
  icmsAliquota: z.string().transform((v) => Number(v.replace(",", ".")) || 0).pipe(z.number().min(0).max(100)),
  pisCofinsCst: z.string().trim().regex(/^\d{2}$/, "Código de 2 dígitos"),
  cfopDentroEstado: z.string().trim().regex(/^\d{4}$/, "CFOP de 4 dígitos"),
  cfopForaEstado: z.string().trim().regex(/^\d{4}$/, "CFOP de 4 dígitos"),
  origemPadrao: z.string().regex(/^[0-8]$/),
  naturezaOperacao: z.string().trim().min(3, "Informe a natureza da operação"),
  informacoesFisco: z.string().trim().transform((v) => v || null),
  focusTokenHomologacao: z.string().trim().optional(),
  focusTokenProducao: z.string().trim().optional(),
});

export async function salvarEmpresaFiscal(_e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirUsuario("notasFiscais");
  const valores = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const r = empresaSchema.safeParse(valores);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, valores };
  }
  // Tokens: em branco mantém o que já está salvo; guardados criptografados.
  const { focusTokenHomologacao, focusTokenProducao, ...dados } = r.data;
  const tokens = {
    ...(focusTokenHomologacao ? { focusTokenHomologacao: criptografar(focusTokenHomologacao) } : {}),
    ...(focusTokenProducao ? { focusTokenProducao: criptografar(focusTokenProducao) } : {}),
  };
  await prisma.empresaFiscal.upsert({ where: { empresaId: await empresaAtualId() }, create: { ...dados, ...tokens }, update: { ...dados, ...tokens } });
  revalidatePath("/notas/configuracao");
  return { mensagem: `Salvo às ${horaLocal(new Date())}` };
}
