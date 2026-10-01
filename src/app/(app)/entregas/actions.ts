"use server";

import type { StatusEntrega } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import type { EstadoFormulario } from "@/lib/clientes";
import { prisma } from "@/lib/db";
import { enderecoEmLinha, entregaSchema, STATUS_ENTREGA, tempoTotal } from "@/lib/entregas";
import { configLoja } from "@/lib/loja";
import { geocodificar, linkGoogleMaps, rotaDeCarro, rotasConfiguradas } from "@/lib/rotas";
import { dataHoraLocal } from "@/lib/tempo";

export async function dadosClienteEntrega(clienteId: string) {
  await exigirUsuario("entregas");
  const c = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      enderecos: { orderBy: { ordem: "asc" } },
      vendas: { where: { status: "FINALIZADA" }, orderBy: { criadoEm: "desc" }, take: 10, select: { id: true, numero: true, total: true, criadoEm: true } },
      ordens: { where: { status: { notIn: ["ENTREGUE", "CANCELADA"] } }, orderBy: { criadoEm: "desc" }, take: 10, select: { id: true, numero: true, aparelho: { select: { modelo: true } } } },
    },
  });
  if (!c) return null;
  const enderecos = [
    { rotulo: "Principal", linha: enderecoEmLinha(c) },
    ...c.enderecos.map((e, i) => ({ rotulo: e.rotulo || `Endereço ${i + 2}`, linha: enderecoEmLinha(e) })),
  ].filter((e) => e.linha.length > 5);
  return {
    enderecos,
    vendas: c.vendas.map((v) => ({ id: v.id, rotulo: `Venda #${v.numero} · R$ ${Number(v.total).toFixed(2).replace(".", ",")} · ${v.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` })),
    ordens: c.ordens.map((o) => ({ id: o.id, rotulo: `OS #${o.numero}${o.aparelho ? ` · ${o.aparelho.modelo}` : ""}` })),
  };
}

export type Estimativa = { erro?: string; distanciaKm?: number; minutosIda?: number; minutosTotal?: number; mapa: string };

export async function estimarRota(endereco: string): Promise<Estimativa> {
  await exigirUsuario("entregas");
  const loja = await configLoja();
  const mapa = linkGoogleMaps(loja.endereco, endereco);
  if (!loja.endereco) return { erro: "Cadastre o endereço da loja em Configurações para calcular o tempo.", mapa };
  if (!rotasConfiguradas()) return { erro: "Cálculo automático não configurado (falta ORS_API_KEY no servidor). Use o link do mapa.", mapa };
  try {
    let origem = loja.latitude != null && loja.longitude != null ? { lat: loja.latitude, lon: loja.longitude } : null;
    if (!origem) {
      origem = await geocodificar(loja.endereco);
      if (!origem) return { erro: "Não encontrei o endereço da loja no mapa. Confira em Configurações.", mapa };
      await prisma.lojaConfig.updateMany({ data: { latitude: origem.lat, longitude: origem.lon } });
    }
    const destino = await geocodificar(endereco);
    if (!destino) return { erro: "Não encontrei esse endereço no mapa. Confira rua, número e cidade.", mapa };
    const rota = await rotaDeCarro(origem, destino);
    if (!rota) return { erro: "Não foi possível traçar a rota até esse endereço.", mapa };
    const minutosIda = Math.max(1, Math.round(rota.segundos / 60));
    return { distanciaKm: Math.round(rota.metros / 100) / 10, minutosIda, minutosTotal: tempoTotal(minutosIda, loja.minutosNoLocalEntrega), mapa };
  } catch (e) {
    console.error("Falha ao calcular rota", e);
    return { erro: "O serviço de mapas não respondeu. Tente de novo ou use o link do mapa.", mapa };
  }
}

export async function criarEntrega(_e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirUsuario("entregas");
  const valores = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const r = entregaSchema.safeParse(valores);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, valores };
  }
  const d = r.data;
  if ((d.dia && !d.hora) || (!d.dia && d.hora)) return { erros: { hora: "Informe o dia e a hora, ou deixe os dois em branco." }, valores };
  const entrega = await prisma.entrega.create({
    data: {
      tipo: d.tipo,
      clienteId: d.clienteId,
      endereco: d.endereco,
      agendadaPara: d.dia && d.hora ? dataHoraLocal(d.dia, d.hora) : null,
      vendaId: d.vendaId,
      osId: d.osId,
      taxa: d.taxa,
      distanciaKm: d.distanciaKm,
      minutosIda: d.minutosIda,
      minutosTotal: d.minutosTotal,
      responsavelId: d.responsavelId,
      observacoes: d.observacoes,
    },
  });
  revalidatePath("/entregas");
  revalidatePath("/agenda");
  redirect(`/entregas#e${entrega.numero}`);
}

export async function mudarStatusEntrega(id: string, status: StatusEntrega) {
  await exigirUsuario("entregas");
  if (!(status in STATUS_ENTREGA)) return;
  await prisma.entrega.update({ where: { id }, data: { status, concluidaEm: status === "CONCLUIDA" ? new Date() : null } });
  revalidatePath("/entregas");
  revalidatePath("/agenda");
}
