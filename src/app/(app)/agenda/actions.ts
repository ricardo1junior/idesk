"use server";

import type { StatusAgendamento } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { agendamentoSchema, conflitoAgendamento, STATUS_AGENDAMENTO } from "@/lib/agenda";
import { exigirUsuario } from "@/lib/auth";
import type { EstadoFormulario } from "@/lib/clientes";
import { prisma } from "@/lib/db";
import { somenteDigitos } from "@/lib/documentos";
import { configLoja } from "@/lib/loja";
import { dataHoraLocal, somarDias } from "@/lib/tempo";

export async function buscarClientesAgenda(termo: string) {
  await exigirUsuario("agenda");
  const q = termo.trim();
  if (q.length < 2) return [];
  const digitos = somenteDigitos(q);
  return prisma.cliente.findMany({
    where: {
      OR: [
        { nome: { contains: q, mode: "insensitive" } },
        ...(digitos.length >= 3 ? [{ documento: { contains: digitos } }, { telefone: { contains: digitos } }, { whatsapp: { contains: digitos } }] : []),
      ],
    },
    select: { id: true, nome: true, telefone: true, whatsapp: true },
    orderBy: { nome: "asc" },
    take: 8,
  });
}

class Conflito extends Error {}

export async function criarAgendamento(_e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirUsuario("agenda");
  const valores = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const r = agendamentoSchema.safeParse(valores);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, valores };
  }
  const d = r.data;
  const inicio = dataHoraLocal(d.dia, d.hora);
  const fim = new Date(inicio.getTime() + d.duracao * 60_000);
  if (inicio.getTime() < Date.now() - 5 * 60_000) return { erros: { hora: "Este horário já passou." }, valores };
  const config = await configLoja();

  try {
    await prisma.$transaction(async (tx) => {
      // Um agendamento por vez para o mesmo dia, evitando dois atendentes pegarem a mesma vaga ao mesmo tempo.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"agenda:" + d.dia}))`;
      const marcados = await tx.agendamento.findMany({
        where: { inicio: { lt: dataHoraLocal(somarDias(d.dia, 1), "00:00") }, fim: { gt: dataHoraLocal(d.dia, "00:00") } },
        select: { inicio: true, fim: true, status: true },
      });
      const conflito = conflitoAgendamento(d.dia, inicio, fim, config, marcados);
      if (conflito) throw new Conflito(conflito);
      await tx.agendamento.create({
        data: {
          inicio,
          fim,
          clienteId: d.clienteId,
          nome: d.nome,
          telefone: d.telefone,
          motivo: d.motivo,
          aparelho: d.aparelho,
          observacoes: d.observacoes,
          usuarioId: usuario.id,
        },
      });
    });
  } catch (e) {
    if (e instanceof Conflito) return { erros: { hora: e.message }, valores };
    throw e;
  }
  revalidatePath("/agenda");
  return { mensagem: `${d.nome} agendado para ${d.hora}.` };
}

export async function mudarStatusAgendamento(id: string, status: StatusAgendamento) {
  await exigirUsuario("agenda");
  if (!(status in STATUS_AGENDAMENTO)) return;
  await prisma.agendamento.update({ where: { id }, data: { status } });
  revalidatePath("/agenda");
}
