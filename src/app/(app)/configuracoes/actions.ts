"use server";

import { revalidatePath } from "next/cache";
import { configLojaSchema } from "@/lib/agenda";
import { exigirUsuario } from "@/lib/auth";
import type { EstadoFormulario } from "@/lib/clientes";
import { prisma } from "@/lib/db";

export async function salvarConfigLoja(_e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirUsuario("configuracoes");
  const valores = Object.fromEntries([...formData.entries()].filter(([k]) => k !== "diasSemana").map(([k, v]) => [k, String(v)]));
  const r = configLojaSchema.safeParse({ ...valores, diasSemana: formData.getAll("diasSemana") });
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, valores };
  }
  const anterior = await prisma.lojaConfig.findUnique({ where: { id: "loja" }, select: { endereco: true } });
  // Endereço mudou: as coordenadas guardadas deixam de valer.
  const coordenadas = anterior?.endereco !== r.data.endereco ? { latitude: null, longitude: null } : {};
  await prisma.lojaConfig.upsert({ where: { id: "loja" }, create: r.data, update: { ...r.data, ...coordenadas } });
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
  return { mensagem: `Salvo às ${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}` };
}
