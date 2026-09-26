"use server";

import type { FormaPagamento } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import type { EstadoFormulario } from "@/lib/clientes";
import { prisma } from "@/lib/db";
import { lancamentoSchema } from "@/lib/financeiro";
import { FORMAS_PAGAMENTO } from "@/lib/vendas";

export async function criarLancamento(_e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirUsuario("financeiro");
  const valores = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const r = lancamentoSchema.safeParse(valores);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, valores };
  }
  const d = r.data;
  const primeira = new Date(`${d.vencimento}T12:00:00`);
  const centavos = Math.round(d.valor * 100);
  const base = Math.floor(centavos / d.parcelas);

  await prisma.$transaction(
    Array.from({ length: d.parcelas }, (_, i) => {
      const venc = new Date(primeira);
      venc.setMonth(venc.getMonth() + i);
      const pago = d.pago === "sim" && i === 0 && d.parcelas === 1;
      return prisma.lancamento.create({
        data: {
          tipo: d.tipo,
          status: pago ? "PAGO" : "PENDENTE",
          descricao: d.descricao,
          valor: (i === d.parcelas - 1 ? centavos - base * (d.parcelas - 1) : base) / 100,
          vencimento: venc,
          pagoEm: pago ? venc : null,
          forma: d.forma ?? null,
          parcela: d.parcelas > 1 ? i + 1 : null,
          totalParcelas: d.parcelas > 1 ? d.parcelas : null,
          categoriaId: d.categoriaId ?? null,
          observacoes: d.observacoes ?? null,
          usuarioId: usuario.id,
        },
      });
    }),
  );
  revalidatePath("/financeiro");
  return { mensagem: d.parcelas > 1 ? `${d.parcelas} parcelas lançadas.` : "Lançamento criado." };
}

export async function baixarLancamento(id: string, formData: FormData) {
  await exigirUsuario("financeiro");
  const data = String(formData.get("data") || new Date().toISOString().slice(0, 10));
  const forma = String(formData.get("forma") || "");
  await prisma.lancamento.update({
    where: { id, status: "PENDENTE" },
    data: {
      status: "PAGO",
      pagoEm: new Date(`${data}T12:00:00`),
      ...(forma in FORMAS_PAGAMENTO ? { forma: forma as FormaPagamento } : {}),
    },
  });
  revalidatePath("/financeiro");
}

export async function estornarLancamento(id: string) {
  await exigirUsuario("financeiro");
  await prisma.lancamento.update({ where: { id, status: "PAGO" }, data: { status: "PENDENTE", pagoEm: null } });
  revalidatePath("/financeiro");
}

export async function cancelarLancamento(id: string) {
  await exigirUsuario("financeiro");
  await prisma.lancamento.update({ where: { id }, data: { status: "CANCELADO" } });
  revalidatePath("/financeiro");
}
