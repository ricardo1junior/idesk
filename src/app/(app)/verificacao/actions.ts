"use server";

import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pode } from "@/lib/permissoes";
import { ultimasVerificacoes } from "@/lib/verificacao";
import { consultarImei, servicosConfigurados } from "@/lib/verificacao/servicos";

export type ItemVerificacao = { fonte: string; situacao: string; resumo: string; criadoEm: string };
export type RespostaVerificacao = { configurado: boolean; erro?: string; itens: ItemVerificacao[] };

const serializar = (v: { fonte: string; situacao: string; resumo: string; criadoEm: Date }): ItemVerificacao => ({
  fonte: v.fonte,
  situacao: v.situacao,
  resumo: v.resumo,
  criadoEm: v.criadoEm.toISOString(),
});

export async function historicoImei(imei: string): Promise<RespostaVerificacao> {
  await exigirUsuario();
  if (!/^\d{15}$/.test(imei)) return { configurado: servicosConfigurados().length > 0, itens: [] };
  return { configurado: servicosConfigurados().length > 0, itens: (await ultimasVerificacoes(imei)).map(serializar) };
}

// Faz a consulta paga nos serviços configurados e guarda o resultado.
export async function verificarImei(imei: string, aparelhoId?: string): Promise<RespostaVerificacao> {
  const usuario = await exigirUsuario();
  if (!pode(usuario.perfil, "verificarImei")) return { configurado: true, erro: "Seu perfil não pode fazer consultas de IMEI. Peça a um vendedor ou técnico.", itens: [] };
  if (!/^\d{15}$/.test(imei)) return { configurado: true, erro: "IMEI deve ter 15 dígitos", itens: [] };
  if (!servicosConfigurados().length) return { configurado: false, itens: [] };

  const aparelho = aparelhoId ? null : await prisma.aparelho.findUnique({ where: { imei }, select: { id: true } });
  const consultas = await consultarImei(imei);
  const salvas = await prisma.$transaction(
    consultas.map((c) =>
      prisma.verificacaoImei.create({
        data: {
          imei,
          aparelhoId: aparelhoId ?? aparelho?.id ?? null,
          fonte: c.fonte,
          situacao: c.situacao,
          resumo: c.resumo,
          detalhes: c.detalhes ?? undefined,
          usuarioId: usuario.id,
        },
      }),
    ),
  );
  revalidatePath("/", "layout");
  return { configurado: true, itens: salvas.map(serializar) };
}
