import "server-only";
import type { ConfigSistema, FormaRecarga } from "@prisma/client";
import { cache } from "react";
import { consultarCobranca, criarClienteAsaas, criarCobrancaAsaas, pixDaCobranca, STATUS_PAGO, type FormaAsaas } from "./asaas";
import { diasRestantes, planejarDiarias, situacaoDoSaldo, type SituacaoCarteira } from "./carteira-regras";
import { prismaBase as db } from "./db";
import { memoComValidade } from "./memo";
import { somarDias, ymdLocal } from "./tempo";

// Carteira de créditos de cada loja: saldo pré-pago, descontado a cada dia de uso.
// Usa o cliente sem filtro de loja porque também roda no aviso do Asaas e na rotina diária.

/** Valores gerais da cobrança (guardados por 1 min; quem altera chama configSistema.esquecer). */
export const configSistema = memoComValidade<void, ConfigSistema>(60_000, () => db.configSistema.upsert({ where: { id: "sistema" }, create: { id: "sistema" }, update: {} }));

const diaDb = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const ymdDb = (d: Date) => d.toISOString().slice(0, 10);

export type ResumoCarteira = { saldo: number; diaria: number; diasTolerancia: number; situacao: SituacaoCarteira; diasRestantes: number; isenta: boolean };

/** Desconta as diárias que faltam e devolve o saldo e a situação da loja. */
export async function atualizarCarteira(empresaId: string): Promise<ResumoCarteira> {
  const [empresa, config] = await Promise.all([
    db.empresa.findUniqueOrThrow({ where: { id: empresaId }, select: { isenta: true, diaria: true, cobradoAte: true } }),
    configSistema(),
  ]);
  const diaria = Number(empresa.diaria ?? config.diariaPadrao);
  const hoje = ymdLocal(new Date());
  // Saldo e "diária de hoje já paga" numa consulta só.
  let { saldo, diariaDeHojePaga } = empresa.isenta ? { saldo: 0, diariaDeHojePaga: true } : await saldoEHoje(empresaId, hoje);

  if (!empresa.isenta && diaria > 0) {
    const ontem = somarDias(hoje, -1);
    // Loja que ainda não tinha cobrança começa a pagar hoje. Se hoje ficou sem diária (saldo esgotado),
    // tenta de novo: depois de uma recarga a loja volta a usar no mesmo dia. Dias passados sem uso não são cobrados.
    const cobradoAte = empresa.cobradoAte ? ymdDb(empresa.cobradoAte) : ontem;
    const ultimoDia = diariaDeHojePaga || cobradoAte < hoje ? cobradoAte : ontem;
    const dias = ultimoDia < hoje ? planejarDiarias({ ultimoDia, hoje, saldo, diaria, diasTolerancia: config.diasTolerancia }) : [];
    if (dias.length || cobradoAte < hoje) {
      await db.$transaction([
        db.movimentoCredito.createMany({
          data: dias.map((d) => ({ empresaId, tipo: "DIARIA" as const, valor: -diaria, descricao: `Diária de ${d.split("-").reverse().join("/")}`, referencia: `diaria:${d}` })),
          skipDuplicates: true,
        }),
        db.empresa.update({ where: { id: empresaId }, data: { cobradoAte: diaDb(hoje) } }),
      ]);
    }
    if (dias.length) saldo = await saldoDe(empresaId);
    if (dias.includes(hoje)) diariaDeHojePaga = true;
  }
  return {
    saldo,
    diaria,
    diasTolerancia: config.diasTolerancia,
    isenta: empresa.isenta,
    situacao: situacaoDoSaldo({ isenta: empresa.isenta, saldo, diaria, diariaDeHojePaga }),
    diasRestantes: diasRestantes(saldo, diaria),
  };
}

/** Situação da loja nesta requisição (memorizada). */
export const carteiraDaLoja = cache((empresaId: string) => atualizarCarteira(empresaId));

async function saldoEHoje(empresaId: string, hoje: string) {
  const [r] = await db.$queryRaw<{ saldo: unknown; hoje: boolean | null }[]>`
    SELECT COALESCE(SUM("valor"), 0) AS saldo, bool_or("referencia" = ${`diaria:${hoje}`}) AS hoje
    FROM "MovimentoCredito" WHERE "empresaId" = ${empresaId}`;
  return { saldo: Number(r.saldo), diariaDeHojePaga: !!r.hoje };
}

/** Situação usada para liberar gravações (guardada por 15 s; recargas e ajustes chamam esquecerCarteira). */
export const situacaoParaGravar = memoComValidade(15_000, async (empresaId: string) => (await atualizarCarteira(empresaId)).situacao);
export const esquecerCarteira = (empresaId: string) => situacaoParaGravar.esquecer(empresaId);

export async function saldoDe(empresaId: string): Promise<number> {
  const r = await db.movimentoCredito.aggregate({ where: { empresaId }, _sum: { valor: true } });
  return Number(r._sum.valor ?? 0);
}

export async function lancarCredito(empresaId: string, c: { tipo: "BONUS" | "AJUSTE" | "RECARGA"; valor: number; descricao: string; referencia: string; usuarioId?: string }) {
  await db.movimentoCredito.createMany({ data: [{ empresaId, ...c }], skipDuplicates: true });
  esquecerCarteira(empresaId);
}

const FORMA_ASAAS: Record<FormaRecarga, FormaAsaas> = { PIX: "PIX", BOLETO: "BOLETO", CARTAO: "CREDIT_CARD" };

/** Gera a cobrança no Asaas (Pix, boleto ou cartão) para a loja colocar créditos. */
export async function gerarRecarga(empresaId: string, valor: number, forma: FormaRecarga, usuarioId: string) {
  const empresa = await db.empresa.findUniqueOrThrow({ where: { id: empresaId }, select: { nome: true, razaoSocial: true, documento: true, email: true, asaasClienteId: true } });
  if (!empresa.documento) throw new ErroRecarga("Cadastre o CNPJ ou CPF da loja em Configurações antes de recarregar.");
  let cliente = empresa.asaasClienteId;
  if (!cliente) {
    cliente = await criarClienteAsaas({ nome: empresa.razaoSocial || empresa.nome, documento: empresa.documento, email: empresa.email, referencia: empresaId });
    await db.empresa.update({ where: { id: empresaId }, data: { asaasClienteId: cliente } });
  }
  const vencimento = somarDias(ymdLocal(new Date()), forma === "BOLETO" ? 3 : 1);
  const cobranca = await criarCobrancaAsaas({ cliente, forma: FORMA_ASAAS[forma], valor, vencimento, descricao: `Créditos iDesk - ${empresa.nome}`, referencia: empresaId });
  const pix = forma === "PIX" ? await pixDaCobranca(cobranca.id).catch(() => null) : null;
  return db.recarga.create({
    data: {
      empresaId,
      valor,
      forma,
      cobrancaId: cobranca.id,
      link: cobranca.invoiceUrl ?? cobranca.bankSlipUrl ?? null,
      pixCopiaCola: pix?.payload ?? null,
      pixQrCode: pix?.encodedImage ?? null,
      vencimento: diaDb(vencimento),
      usuarioId,
    },
  });
}

export class ErroRecarga extends Error {}

/**
 * Confere no Asaas se a cobrança foi paga e, se foi, credita o valor (uma vez só).
 * Chamado pelo aviso automático do Asaas e pelo botão "Já paguei".
 */
export async function confirmarRecarga(cobrancaId: string): Promise<"PAGA" | "PENDENTE" | "DESCONHECIDA"> {
  const recarga = await db.recarga.findUnique({ where: { cobrancaId } });
  if (!recarga) return "DESCONHECIDA";
  if (recarga.status === "PAGA") return "PAGA";
  const cobranca = await consultarCobranca(cobrancaId);
  if (!STATUS_PAGO.includes(cobranca.status)) return "PENDENTE";
  await db.$transaction([
    db.recarga.update({ where: { id: recarga.id }, data: { status: "PAGA", pagaEm: new Date() } }),
    db.movimentoCredito.createMany({
      data: [
        {
          empresaId: recarga.empresaId,
          tipo: "RECARGA",
          valor: recarga.valor,
          descricao: `Recarga por ${recarga.forma === "CARTAO" ? "cartão" : recarga.forma === "PIX" ? "Pix" : "boleto"}`,
          referencia: `asaas:${cobrancaId}`,
          usuarioId: recarga.usuarioId,
        },
      ],
      skipDuplicates: true,
    }),
  ]);
  esquecerCarteira(recarga.empresaId);
  return "PAGA";
}

/**
 * Pagamento devolvido ou contestado no Asaas: tira o crédito (uma vez só).
 * Cobrança apagada antes de pagar: só marca a recarga como cancelada.
 */
export async function estornarRecarga(cobrancaId: string, motivo: "ESTORNO" | "APAGADA") {
  const recarga = await db.recarga.findUnique({ where: { cobrancaId } });
  if (!recarga) return;
  if (recarga.status !== "PAGA") {
    await db.recarga.update({ where: { id: recarga.id }, data: { status: "CANCELADA" } });
    return;
  }
  if (motivo === "APAGADA") return;
  await lancarCredito(recarga.empresaId, { tipo: "AJUSTE", valor: -Number(recarga.valor), descricao: "Estorno de recarga (pagamento devolvido ou contestado)", referencia: `estorno:${cobrancaId}` });
}

/** Crédito de boas-vindas e início da cobrança de uma loja nova. */
export async function iniciarCarteira(empresaId: string) {
  const config = await configSistema();
  const bonus = Number(config.creditoBoasVindas);
  if (bonus > 0) await lancarCredito(empresaId, { tipo: "BONUS", valor: bonus, descricao: "Crédito de boas-vindas", referencia: "boas-vindas" });
  await db.empresa.update({ where: { id: empresaId }, data: { cobradoAte: diaDb(somarDias(ymdLocal(new Date()), -1)) } });
  esquecerCarteira(empresaId);
}

/** Saldo e situação de todas as lojas em poucas consultas (painel do dono; não desconta diárias). */
export async function resumoDasLojas(): Promise<Map<string, { saldo: number; isenta: boolean; situacao: SituacaoCarteira }>> {
  const hoje = ymdLocal(new Date());
  const [lojas, somas, pagasHoje, config] = await Promise.all([
    db.empresa.findMany({ select: { id: true, isenta: true, diaria: true } }),
    db.movimentoCredito.groupBy({ by: ["empresaId"], _sum: { valor: true } }),
    db.movimentoCredito.findMany({ where: { referencia: `diaria:${hoje}` }, select: { empresaId: true } }),
    configSistema(),
  ]);
  const pagas = new Set(pagasHoje.map((p) => p.empresaId));
  return new Map(
    lojas.map((l) => {
      const saldo = Number(somas.find((s) => s.empresaId === l.id)?._sum.valor ?? 0);
      const diaria = Number(l.diaria ?? config.diariaPadrao);
      return [l.id, { saldo, isenta: l.isenta, situacao: situacaoDoSaldo({ isenta: l.isenta, saldo, diaria, diariaDeHojePaga: pagas.has(l.id) }) }];
    }),
  );
}
