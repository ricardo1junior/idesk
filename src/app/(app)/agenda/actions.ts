"use server";

import type { Tx } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { agendamentoSchema, conflitoAgendamento, OCUPA_VAGA, statusAgendamentoValido, TRANSICOES_AGENDA, type ConfigAgenda } from "@/lib/agenda";
import { exigirUsuario } from "@/lib/auth";
import type { EstadoFormulario } from "@/lib/clientes";
import { empresaAtualId, prisma } from "@/lib/db";
import { somenteDigitos } from "@/lib/documentos";
import { configLoja } from "@/lib/loja";
import { dataHoraLocal, somarDias, ymdLocal } from "@/lib/tempo";

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

// Trava a agenda do dia (dois atendentes não pegam a mesma vaga ao mesmo tempo) e confere se o horário cabe.
async function conferirVaga(tx: Tx, dia: string, inicio: Date, fim: Date, config: ConfigAgenda, ignorarId?: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"agenda:" + (await empresaAtualId()) + ":" + dia}))`;
  const marcados = await tx.agendamento.findMany({
    where: {
      inicio: { lt: dataHoraLocal(somarDias(dia, 1), "00:00") },
      fim: { gt: dataHoraLocal(dia, "00:00") },
      ...(ignorarId ? { id: { not: ignorarId } } : {}),
    },
    select: { inicio: true, fim: true, status: true },
  });
  const conflito = conflitoAgendamento(dia, inicio, fim, config, marcados);
  if (conflito) throw new Conflito(conflito);
}

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
  if (d.clienteId && !(await prisma.cliente.findFirst({ where: { id: d.clienteId }, select: { id: true } }))) {
    return { erros: { nome: "Cliente não encontrado. Busque e selecione de novo." }, valores };
  }
  const config = await configLoja();

  try {
    await prisma.$transaction(async (tx) => {
      await conferirVaga(tx, d.dia, inicio, fim, config);
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

// Devolve a mensagem de erro (ou null) para o botão mostrar.
export async function mudarStatusAgendamento(id: string, status: string): Promise<string | null> {
  await exigirUsuario("agenda");
  if (!statusAgendamentoValido(status)) return "Status inválido.";
  const config = await configLoja();
  try {
    await prisma.$transaction(async (tx) => {
      const a = await tx.agendamento.findFirst({ where: { id } });
      if (!a) throw new Conflito("Agendamento não encontrado.");
      if (a.status === status) return; // clique repetido
      if (!TRANSICOES_AGENDA[a.status].includes(status)) throw new Conflito("Este agendamento não pode mais mudar para esse status.");
      // Reativar volta a ocupar vaga: mesmas regras de um agendamento novo.
      if (OCUPA_VAGA.includes(status) && !OCUPA_VAGA.includes(a.status)) {
        if (a.inicio.getTime() < Date.now() - 5 * 60_000) throw new Conflito("Este horário já passou. Faça um agendamento novo.");
        await conferirVaga(tx, ymdLocal(a.inicio), a.inicio, a.fim, config, a.id);
      }
      // updateMany com o status lido: se outra pessoa mudou no meio tempo, nada é sobrescrito.
      await tx.agendamento.updateMany({ where: { id, status: a.status }, data: { status } });
    });
  } catch (e) {
    if (e instanceof Conflito) return e.message;
    throw e;
  }
  revalidatePath("/agenda");
  return null;
}
