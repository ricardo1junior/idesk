"use server";

import type { FormaRecarga } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ErroAsaas, asaasConfigurado } from "@/lib/asaas";
import { exigirUsuario } from "@/lib/auth";
import { confirmarRecarga, configSistema, ErroRecarga, gerarRecarga } from "@/lib/carteira";
import { prismaBase } from "@/lib/db";
import { paraNumero } from "@/lib/estoque";

export type EstadoRecarga = { erro?: string; ok?: string };

export async function novaRecarga(_e: EstadoRecarga, formData: FormData): Promise<EstadoRecarga> {
  const usuario = await exigirUsuario("assinatura");
  if (!asaasConfigurado()) return { erro: "Recarga online ainda não disponível. Fale com o suporte do sistema." };
  const forma = String(formData.get("forma")) as FormaRecarga;
  if (!["PIX", "BOLETO", "CARTAO"].includes(forma)) return { erro: "Escolha a forma de pagamento." };
  const valor = Math.round(paraNumero(formData.get("valor")) * 100) / 100;
  const minimo = Number((await configSistema()).recargaMinima);
  if (!(valor >= minimo)) return { erro: `A recarga mínima é de ${minimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.` };
  if (valor > 10000) return { erro: "Valor acima do permitido para uma recarga." };
  try {
    await gerarRecarga(usuario.empresaId, valor, forma, usuario.id);
  } catch (e) {
    if (e instanceof ErroRecarga || e instanceof ErroAsaas) return { erro: e.message };
    throw e;
  }
  revalidatePath("/assinatura");
  return { ok: "Cobrança gerada. Pague abaixo; o crédito entra assim que o pagamento for confirmado." };
}

export async function verificarRecarga(recargaId: string): Promise<EstadoRecarga> {
  const usuario = await exigirUsuario("assinatura");
  const recarga = await prismaBase.recarga.findFirst({ where: { id: recargaId, empresaId: usuario.empresaId } });
  if (!recarga) return { erro: "Recarga não encontrada." };
  try {
    const r = await confirmarRecarga(recarga.cobrancaId);
    revalidatePath("/", "layout");
    return r === "PAGA" ? { ok: "Pagamento confirmado. Créditos adicionados." } : { erro: "O pagamento ainda não foi confirmado. Pix costuma cair em segundos; boleto, em até 2 dias úteis." };
  } catch (e) {
    if (e instanceof ErroAsaas) return { erro: e.message };
    throw e;
  }
}
