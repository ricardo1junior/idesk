"use server";

import { Prisma, type FormaPagamento, type StatusOS } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/lib/clientes";
import { exigirUsuario } from "@/lib/auth";
import { lerFotosJson, MAX_FOTOS_OS } from "@/lib/fotos";
import { paraNumero } from "@/lib/estoque";
import { categoriaId, parcelarPagamento } from "@/lib/financeiro";
import { FORMAS_PAGAMENTO } from "@/lib/vendas";
import { criptografar, descriptografar } from "@/lib/cripto";
import { prisma } from "@/lib/db";
import { somenteDigitos } from "@/lib/documentos";
import { ACESSORIOS, aberturaOSSchema, CHECKLIST, itemOSSchema, RESULTADOS_CHECKLIST, STATUS_OS } from "@/lib/os";

export async function buscarClientes(termo: string) {
  await exigirUsuario();
  const q = termo.trim();
  if (q.length < 2) return [];
  const digitos = somenteDigitos(q);
  return prisma.cliente.findMany({
    where: {
      OR: [
        { nome: { contains: q, mode: "insensitive" } },
        { nomeFantasia: { contains: q, mode: "insensitive" } },
        ...(digitos.length >= 3
          ? [{ documento: { contains: digitos } }, { telefone: { contains: digitos } }, { whatsapp: { contains: digitos } }, { contatos: { some: { valor: { contains: digitos } } } }]
          : []),
      ],
    },
    select: { id: true, nome: true, documento: true, tipo: true },
    orderBy: { nome: "asc" },
    take: 10,
  });
}

export async function abrirOS(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirUsuario("os");
  const valores: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !(k in valores)) valores[k] = v;

  const resultado = aberturaOSSchema.safeParse(valores);
  if (!resultado.success) {
    const erros: Record<string, string> = {};
    for (const issue of resultado.error.issues) erros[String(issue.path[0])] ??= issue.message;
    return { erros, valores };
  }
  const d = resultado.data;

  const checklist = Object.fromEntries(
    CHECKLIST.map(({ id }) => {
      const r = formData.get(`check_${id}`);
      return [id, typeof r === "string" && r in RESULTADOS_CHECKLIST ? r : "NAO_TESTADO"];
    }),
  );
  const acessorios = formData
    .getAll("acessorios")
    .filter((a): a is string => typeof a === "string" && (ACESSORIOS as readonly string[]).includes(a));
  if (d.acessoriosOutros) acessorios.push(d.acessoriosOutros);

  const dadosAparelho = {
    modelo: d.modelo,
    cor: d.cor,
    capacidade: d.capacidade,
    saudeBateria: d.saudeBateria ? Number(d.saudeBateria) : null,
  };

  let osId: string;
  try {
    osId = await prisma.$transaction(async (tx) => {
      // Reaproveita o cadastro do aparelho quando o IMEI/serial já é conhecido.
      const existente =
        (d.imei && (await tx.aparelho.findUnique({ where: { imei: d.imei } }))) ||
        (d.serial && (await tx.aparelho.findUnique({ where: { serial: d.serial } }))) ||
        null;

      const aparelho = existente
        ? await tx.aparelho.update({
            where: { id: existente.id },
            data: {
              ...dadosAparelho,
              imei: d.imei ?? existente.imei,
              serial: d.serial ?? existente.serial,
              // Aparelho do estoque da loja não muda de dono ao entrar em manutenção.
              ...(existente.situacao === "EM_ESTOQUE" ? {} : { clienteId: d.clienteId }),
            },
          })
        : await tx.aparelho.create({
            data: { ...dadosAparelho, imei: d.imei, serial: d.serial, clienteId: d.clienteId, situacao: "DO_CLIENTE" },
          });

      const os = await tx.ordemServico.create({
        data: {
          clienteId: d.clienteId,
          aparelhoId: aparelho.id,
          defeitoRelatado: d.defeitoRelatado,
          checklist,
          icloudBloqueado: d.icloudBloqueado === "sim" ? true : d.icloudBloqueado === "nao" ? false : null,
          tipoSenha: d.tipoSenha,
          senhaAparelho: d.senha ? criptografar(d.senha) : null,
          marcasUso: d.marcasUso,
          acessorios,
          precisaBackup: d.precisaBackup === "sim",
          backupObs: d.precisaBackup === "sim" ? d.backupObs : null,
          previsaoEntrega: d.previsaoEntrega ? new Date(`${d.previsaoEntrega}T18:00:00`) : null,
          garantiaDias: d.garantiaDias,
          historico: { create: { status: "ABERTA", nota: "OS aberta" } },
        },
      });
      await ligarFotos(tx, os.id, formData.get("fotos"));
      return os.id;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { erros: { imei: "IMEI ou número de série já cadastrado em outro aparelho" }, valores };
    }
    throw e;
  }

  revalidatePath("/os");
  redirect(`/os/${osId}`);
}

export async function mudarStatus(osId: string, formData: FormData) {
  await exigirUsuario("editarOS");
  const status = String(formData.get("status")) as StatusOS;
  if (!(status in STATUS_OS)) return;
  const nota = String(formData.get("nota") ?? "").trim() || null;
  const diagnostico = formData.get("diagnostico");

  await prisma.ordemServico.update({
    where: { id: osId },
    data: {
      status,
      ...(typeof diagnostico === "string" ? { diagnostico: diagnostico.trim() || null } : {}),
      entregueEm: status === "ENTREGUE" ? new Date() : undefined,
      historico: { create: { status, nota } },
    },
  });
  revalidatePath(`/os/${osId}`);
  revalidatePath("/os");
}

async function recalcularTotal(tx: Prisma.TransactionClient, osId: string) {
  const [itens, os] = await Promise.all([
    tx.itemOS.findMany({ where: { osId } }),
    tx.ordemServico.findUniqueOrThrow({ where: { id: osId }, select: { desconto: true } }),
  ]);
  const subtotal = itens.reduce((s, i) => s.add(i.valorUnit.mul(i.quantidade)), new Prisma.Decimal(0));
  const total = Prisma.Decimal.max(subtotal.sub(os.desconto), 0);
  await tx.ordemServico.update({ where: { id: osId }, data: { total } });
}

export async function adicionarItem(osId: string, _estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirUsuario("editarOS");
  const valores = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const r = itemOSSchema.safeParse(valores);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const issue of r.error.issues) erros[String(issue.path[0])] ??= issue.message;
    return { erros, valores };
  }
  const descricao = r.data.tipo === "PECA" ? `Peça: ${r.data.descricao}` : r.data.descricao;
  await prisma.$transaction(async (tx) => {
    await tx.itemOS.create({
      data: { osId, descricao, quantidade: r.data.quantidade, valorUnit: r.data.valorUnit },
    });
    await recalcularTotal(tx, osId);
  });
  revalidatePath(`/os/${osId}`);
  return {};
}

export async function removerItem(osId: string, itemId: string) {
  await exigirUsuario("editarOS");
  await prisma.$transaction(async (tx) => {
    await tx.itemOS.delete({ where: { id: itemId, osId } });
    await recalcularTotal(tx, osId);
  });
  revalidatePath(`/os/${osId}`);
}

export async function definirDesconto(osId: string, formData: FormData) {
  await exigirUsuario("editarOS");
  const bruto = String(formData.get("desconto") ?? "0").replace(/\./g, "").replace(",", ".");
  const desconto = Number(bruto);
  if (!Number.isFinite(desconto) || desconto < 0) return;
  await prisma.$transaction(async (tx) => {
    await tx.ordemServico.update({ where: { id: osId }, data: { desconto } });
    await recalcularTotal(tx, osId);
  });
  revalidatePath(`/os/${osId}`);
}

export async function registrarPagamentoOS(osId: string, _e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirUsuario("receberOS");
  const forma = String(formData.get("forma")) as FormaPagamento;
  const valor = paraNumero(formData.get("valor"));
  const parcelas = Math.max(1, Math.trunc(paraNumero(formData.get("parcelas")) || 1));
  if (!(forma in FORMAS_PAGAMENTO) || forma === "TROCA") return { erros: { forma: "Escolha a forma de pagamento" } };
  if (!(valor > 0)) return { erros: { valor: "Informe o valor" } };

  await prisma.$transaction(async (tx) => {
    const os = await tx.ordemServico.findUniqueOrThrow({ where: { id: osId } });
    const categoria = await categoriaId(tx, "ENTRADA", "Serviços (OS)");
    const agora = new Date();
    for (const p of parcelarPagamento(forma, valor, parcelas, agora)) {
      await tx.lancamento.create({
        data: {
          tipo: "ENTRADA",
          status: p.pago ? "PAGO" : "PENDENTE",
          descricao: `OS #${os.numero}`,
          valor: p.valor,
          vencimento: p.vencimento,
          pagoEm: p.pago ? agora : null,
          forma,
          parcela: p.parcela,
          totalParcelas: p.totalParcelas,
          categoriaId: categoria,
          clienteId: os.clienteId,
          osId,
          usuarioId: usuario.id,
        },
      });
    }
  });
  revalidatePath(`/os/${osId}`);
  return { mensagem: "Pagamento registrado." };
}

export async function revelarSenha(osId: string): Promise<string | null> {
  await exigirUsuario("verSenhaAparelho");
  const os = await prisma.ordemServico.findUnique({ where: { id: osId }, select: { senhaAparelho: true } });
  return os?.senhaAparelho ? descriptografar(os.senhaAparelho) : null;
}

// Liga à OS as fotos enviadas durante o preenchimento (só as que ainda estão soltas).
async function ligarFotos(tx: Prisma.TransactionClient, osId: string, valor: unknown) {
  const fotos = lerFotosJson(valor);
  const jaTem = await tx.fotoOS.count({ where: { osId } });
  for (const f of fotos.slice(0, Math.max(0, MAX_FOTOS_OS - jaTem))) {
    await tx.fotoOS.updateMany({ where: { id: f.id, osId: null }, data: { osId, tipo: f.tipo, legenda: f.legenda || null } });
  }
}

export async function adicionarFotos(osId: string, fotosJson: string): Promise<{ erro?: string }> {
  await exigirUsuario("os");
  await prisma.$transaction((tx) => ligarFotos(tx, osId, fotosJson));
  revalidatePath(`/os/${osId}`);
  return {};
}

export async function removerFoto(osId: string, fotoId: string) {
  await exigirUsuario("editarOS");
  await prisma.fotoOS.deleteMany({ where: { id: fotoId, osId } });
  revalidatePath(`/os/${osId}`);
}
