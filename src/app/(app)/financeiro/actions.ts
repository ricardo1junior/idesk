"use server";

import type { FormaPagamento } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import type { EstadoFormulario } from "@/lib/clientes";
import { prisma } from "@/lib/db";
import { lancamentoSchema } from "@/lib/financeiro";
import { dataHoraLocal, somarMeses, ymdLocal, ymdValido } from "@/lib/tempo";
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
  if (d.categoriaId && !(await prisma.categoriaFinanceira.findFirst({ where: { id: d.categoriaId, tipo: d.tipo }, select: { id: true } }))) {
    return { erros: { categoriaId: "Categoria não encontrada" }, valores };
  }
  const centavos = Math.round(d.valor * 100);
  const base = Math.floor(centavos / d.parcelas);

  await prisma.lancamento.createMany({
    data: Array.from({ length: d.parcelas }, (_, i) => {
      // Mesmo dia nos meses seguintes (31/01 → 28/02 → 31/03), meio-dia em Brasília.
      const venc = dataHoraLocal(somarMeses(d.vencimento, i), "12:00");
      const pago = d.pago === "sim" && i === 0 && d.parcelas === 1;
      return {
        tipo: d.tipo,
        status: pago ? ("PAGO" as const) : ("PENDENTE" as const),
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
      };
    }),
  });
  revalidatePath("/financeiro");
  return { mensagem: d.parcelas > 1 ? `${d.parcelas} parcelas lançadas.` : "Lançamento criado." };
}

// As ações abaixo filtram pela situação no próprio UPDATE: clique duplo ou tela desatualizada não faz nada.
export async function baixarLancamento(id: string, formData: FormData) {
  await exigirUsuario("financeiro");
  const informada = formData.get("data");
  const data = ymdValido(informada) ? informada : ymdLocal(new Date());
  const forma = String(formData.get("forma") || "");
  await prisma.lancamento.updateMany({
    where: { id, status: "PENDENTE" },
    data: {
      status: "PAGO",
      pagoEm: dataHoraLocal(data, "12:00"),
      ...(forma in FORMAS_PAGAMENTO ? { forma: forma as FormaPagamento } : {}),
    },
  });
  revalidatePath("/financeiro");
}

export async function estornarLancamento(id: string) {
  await exigirUsuario("financeiro");
  // Lançamentos de venda são estornados pelo cancelamento da venda.
  await prisma.lancamento.updateMany({ where: { id, status: "PAGO", vendaId: null }, data: { status: "PENDENTE", pagoEm: null } });
  revalidatePath("/financeiro");
}

export async function cancelarLancamento(id: string) {
  await exigirUsuario("financeiro");
  await prisma.lancamento.updateMany({ where: { id, status: "PENDENTE", vendaId: null }, data: { status: "CANCELADO" } });
  revalidatePath("/financeiro");
}
