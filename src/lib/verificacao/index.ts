import "server-only";

import { prisma } from "../db";
import { servicosConfigurados } from "./servicos";

export const VALIDADE_VERIFICACAO_MS = 24 * 60 * 60 * 1000;

// Última consulta de cada serviço para o IMEI.
export async function ultimasVerificacoes(imei: string) {
  const registros = await prisma.verificacaoImei.findMany({ where: { imei }, orderBy: { criadoEm: "desc" }, take: 20 });
  const porFonte = new Map<string, (typeof registros)[number]>();
  for (const r of registros) if (!porFonte.has(r.fonte)) porFonte.set(r.fonte, r);
  return [...porFonte.values()];
}

// Regra da troca: com serviços configurados, o IMEI precisa ter sido consultado nas últimas 24 h
// em todos eles, e nenhum pode apontar restrição. Devolve a mensagem de bloqueio ou null.
export async function bloqueioTroca(imei: string | undefined): Promise<string | null> {
  const fontes = servicosConfigurados();
  if (!fontes.length) return null;
  if (!imei) return "Troca: informe o IMEI para a verificação de restrição.";
  const ultimas = await ultimasVerificacoes(imei);
  const restricao = ultimas.find((v) => v.situacao === "RESTRICAO");
  if (restricao) return `Troca bloqueada: ${restricao.resumo}`;
  const limite = Date.now() - VALIDADE_VERIFICACAO_MS;
  const faltando = fontes.filter((f) => !ultimas.some((v) => v.fonte === f && v.criadoEm.getTime() >= limite && v.situacao !== "ERRO"));
  if (faltando.length) return "Troca: clique em \"Verificar IMEI\" no aparelho da troca antes de finalizar.";
  return null;
}
