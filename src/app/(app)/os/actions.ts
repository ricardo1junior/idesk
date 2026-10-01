"use server";

import type { Tx } from "@/lib/db";
import { Prisma, type FormaPagamento } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/lib/clientes";
import { exigirUsuario } from "@/lib/auth";
import { lerFotosJson, MAX_FOTOS_OS } from "@/lib/fotos";
import { paraNumero } from "@/lib/estoque";
import { categoriaId, parcelarPagamento } from "@/lib/financeiro";
import { FORMAS_PAGAMENTO } from "@/lib/vendas";
import { criptografar, descriptografar } from "@/lib/cripto";
import { empresaAtualId, prisma } from "@/lib/db";
import { somenteDigitos } from "@/lib/documentos";
import {
  ACESSORIOS,
  aberturaOSSchema,
  CHECKLIST,
  formatarMoeda,
  itemOSSchema,
  orcamentoTravado,
  podeMudarStatusOS,
  RESULTADOS_CHECKLIST,
  STATUS_OS,
  statusOSValido,
} from "@/lib/os";
import { dataHoraLocal, ymdValido } from "@/lib/tempo";

// Erro com mensagem para o usuário, lançado dentro da transação para desfazê-la.
class ErroOS extends Error {
  constructor(
    message: string,
    readonly campo = "form",
  ) {
    super(message);
  }
}

// Trava a linha da OS até o fim da transação (pagamentos, itens e status simultâneos) e a devolve.
async function travarOS(tx: Tx, osId: string) {
  await tx.$executeRaw`SELECT 1 FROM "OrdemServico" WHERE "id" = ${osId} AND "empresaId" = ${await empresaAtualId()} FOR UPDATE`;
  const os = await tx.ordemServico.findFirst({ where: { id: osId } });
  if (!os) throw new ErroOS("Ordem de serviço não encontrada.");
  return os;
}

function mensagemTravada(status: string) {
  return `OS ${status === "ENTREGUE" ? "entregue" : "cancelada"}: o orçamento não pode mais ser alterado.`;
}

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
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !Object.hasOwn(valores, k)) valores[k] = v;
  // Checkboxes de acessórios têm vários valores: voltam juntos para remarcar o formulário em caso de erro.
  valores.acessorios = formData.getAll("acessorios").filter((a) => typeof a === "string").join("|");

  const resultado = aberturaOSSchema.safeParse(valores);
  if (!resultado.success) {
    const erros: Record<string, string> = {};
    for (const issue of resultado.error.issues) erros[String(issue.path[0])] ??= issue.message;
    return { erros, valores };
  }
  const d = resultado.data;
  if (!(await prisma.cliente.findFirst({ where: { id: d.clienteId }, select: { id: true } }))) {
    return { erros: { clienteId: "Cliente não encontrado. Busque e selecione de novo." }, valores };
  }

  const checklist = Object.fromEntries(
    CHECKLIST.map(({ id }) => {
      const r = formData.get(`check_${id}`);
      return [id, typeof r === "string" && Object.hasOwn(RESULTADOS_CHECKLIST, r) ? r : "NAO_TESTADO"];
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
        (d.imei && (await tx.aparelho.findFirst({ where: { imei: d.imei } }))) ||
        (d.serial && (await tx.aparelho.findFirst({ where: { serial: d.serial } }))) ||
        null;

      const aparelho = existente
        ? await tx.aparelho.update({
            where: { id: existente.id },
            data: {
              // Campo deixado em branco mantém o que já estava cadastrado.
              modelo: d.modelo,
              cor: d.cor ?? existente.cor,
              capacidade: d.capacidade ?? existente.capacidade,
              saudeBateria: dadosAparelho.saudeBateria ?? existente.saudeBateria,
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
          previsaoEntrega: d.previsaoEntrega ? dataHoraLocal(d.previsaoEntrega, "18:00") : null,
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

export async function mudarStatus(osId: string, _e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirUsuario("editarOS");
  const status = formData.get("status");
  if (!statusOSValido(status)) return { erros: { status: "Escolha o status" } };
  const nota = String(formData.get("nota") ?? "").trim() || null;
  const bruto = formData.get("diagnostico");
  const diagnostico = typeof bruto === "string" ? bruto.trim() || null : undefined;

  try {
    await prisma.$transaction(async (tx) => {
      const os = await travarOS(tx, osId);
      if (!podeMudarStatusOS(os.status, status)) {
        throw new ErroOS(`Uma OS ${STATUS_OS[os.status].label.toLowerCase()} não pode passar para ${STATUS_OS[status].label.toLowerCase()}.`, "status");
      }
      const mudouStatus = status !== os.status;
      const mudouDiagnostico = diagnostico !== undefined && diagnostico !== os.diagnostico;
      // Reenvio do mesmo formulário (clique duplo) não repete a anotação no histórico.
      let anotar = mudouStatus || !!nota;
      if (!mudouStatus && nota) {
        const ultimo = await tx.historicoOS.findFirst({ where: { osId }, orderBy: { criadoEm: "desc" }, select: { status: true, nota: true } });
        anotar = !(ultimo?.status === status && ultimo.nota === nota);
      }
      if (!mudouStatus && !mudouDiagnostico && !anotar) return;
      await tx.ordemServico.update({
        where: { id: osId },
        data: {
          ...(mudouStatus ? { status } : {}),
          ...(mudouDiagnostico ? { diagnostico } : {}),
          // Data da entrega só na primeira vez; desfazer a entrega limpa a data.
          ...(mudouStatus && status === "ENTREGUE" && !os.entregueEm ? { entregueEm: new Date() } : {}),
          ...(mudouStatus && os.status === "ENTREGUE" ? { entregueEm: null } : {}),
          ...(anotar ? { historico: { create: { status, nota } } } : {}),
        },
      });
    });
  } catch (e) {
    if (e instanceof ErroOS) return { erros: { [e.campo]: e.message } };
    throw e;
  }
  revalidatePath(`/os/${osId}`);
  revalidatePath("/os");
  return { mensagem: "OS atualizada." };
}

async function recalcularTotal(tx: Tx, osId: string) {
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
  try {
    await prisma.$transaction(async (tx) => {
      const os = await travarOS(tx, osId);
      if (orcamentoTravado(os.status)) throw new ErroOS(mensagemTravada(os.status));
      await tx.itemOS.create({
        data: { osId, descricao, quantidade: r.data.quantidade, valorUnit: r.data.valorUnit },
      });
      await recalcularTotal(tx, osId);
    });
  } catch (e) {
    if (e instanceof ErroOS) return { erros: { [e.campo]: e.message }, valores };
    throw e;
  }
  revalidatePath(`/os/${osId}`);
  return {};
}

export async function removerItem(osId: string, itemId: string) {
  await exigirUsuario("editarOS");
  await prisma.$transaction(async (tx) => {
    const os = await travarOS(tx, osId);
    if (orcamentoTravado(os.status)) return;
    // deleteMany: clicar duas vezes (ou item já removido em outra aba) não dá erro.
    const { count } = await tx.itemOS.deleteMany({ where: { id: itemId, osId } });
    if (count) await recalcularTotal(tx, osId);
  });
  revalidatePath(`/os/${osId}`);
}

export async function definirDesconto(osId: string, _e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirUsuario("editarOS");
  const desconto = paraNumero(formData.get("desconto"));
  if (!Number.isFinite(desconto) || desconto < 0) return { erros: { desconto: "Desconto inválido" } };
  try {
    await prisma.$transaction(async (tx) => {
      const os = await travarOS(tx, osId);
      if (orcamentoTravado(os.status)) throw new ErroOS(mensagemTravada(os.status), "desconto");
      if (os.desconto.equals(desconto)) return;
      await tx.ordemServico.update({ where: { id: osId }, data: { desconto } });
      await recalcularTotal(tx, osId);
    });
  } catch (e) {
    if (e instanceof ErroOS) return { erros: { [e.campo]: e.message } };
    throw e;
  }
  revalidatePath(`/os/${osId}`);
  return { mensagem: "Desconto aplicado." };
}

export async function registrarPagamentoOS(osId: string, _e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirUsuario("receberOS");
  const forma = String(formData.get("forma"));
  const valor = paraNumero(formData.get("valor"));
  const parcelas = Math.max(1, Math.min(12, Math.trunc(paraNumero(formData.get("parcelas")) || 1)));
  const primeiroVencimento = String(formData.get("primeiroVencimento") ?? "");
  const valores = { forma, valor: String(formData.get("valor") ?? ""), parcelas: String(parcelas), primeiroVencimento };
  if (!Object.hasOwn(FORMAS_PAGAMENTO, forma) || forma === "TROCA") return { erros: { forma: "Escolha a forma de pagamento" }, valores };
  if (Number.isNaN(valor)) return { erros: { valor: "Valor inválido" }, valores };
  if (!(valor > 0)) return { erros: { valor: "Informe o valor" }, valores };
  if (primeiroVencimento && !ymdValido(primeiroVencimento)) return { erros: { primeiroVencimento: "Data de vencimento inválida" }, valores };

  try {
    await prisma.$transaction(async (tx) => {
      // A trava faz o segundo de dois pagamentos simultâneos enxergar o primeiro.
      const os = await travarOS(tx, osId);
      if (os.status === "CANCELADA") throw new ErroOS("OS cancelada não recebe pagamento.");
      const lancado = await tx.lancamento.aggregate({ where: { osId, status: { not: "CANCELADO" } }, _sum: { valor: true } });
      const restante = os.total.sub(lancado._sum.valor ?? 0).toNumber();
      if (restante <= 0) throw new ErroOS("O total desta OS já foi lançado.", "valor");
      if (valor > restante + 0.01) throw new ErroOS(`Valor maior que o restante (${formatarMoeda(restante)}).`, "valor");
      const categoria = await categoriaId(tx, "ENTRADA", "Serviços (OS)");
      const agora = new Date();
      for (const p of parcelarPagamento(forma as FormaPagamento, valor, parcelas, agora, primeiroVencimento || null)) {
        await tx.lancamento.create({
          data: {
            tipo: "ENTRADA",
            status: p.pago ? "PAGO" : "PENDENTE",
            descricao: `OS #${os.numero}`,
            valor: p.valor,
            vencimento: p.vencimento,
            pagoEm: p.pago ? agora : null,
            forma: forma as FormaPagamento,
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
  } catch (e) {
    if (e instanceof ErroOS) return { erros: { [e.campo]: e.message }, valores };
    throw e;
  }
  revalidatePath(`/os/${osId}`);
  return { mensagem: "Pagamento registrado." };
}

export async function revelarSenha(osId: string): Promise<string | null> {
  await exigirUsuario("verSenhaAparelho");
  const os = await prisma.ordemServico.findUnique({ where: { id: osId }, select: { senhaAparelho: true } });
  return os?.senhaAparelho ? descriptografar(os.senhaAparelho) : null;
}

// Liga à OS as fotos enviadas durante o preenchimento (só as que ainda estão soltas).
async function ligarFotos(tx: Tx, osId: string, valor: unknown) {
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
