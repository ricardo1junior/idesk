import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { lerFiltros, whereDosFiltros } from "@/lib/financeiro-filtros";
import { dataLocal } from "@/lib/tempo";
import { FORMAS_PAGAMENTO } from "@/lib/vendas";

// Exporta os lançamentos filtrados em CSV (abre no Excel com ; como separador).
export async function GET(req: Request) {
  await exigirUsuario("financeiro");
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = lerFiltros(sp);
  const lancamentos = await prisma.lancamento.findMany({
    where: whereDosFiltros(f),
    include: { categoria: true, cliente: { select: { nome: true } }, fornecedor: { select: { razaoSocial: true } } },
    orderBy: { vencimento: "asc" },
    take: 20000,
  });
  const campo = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const data = (d: Date | null) => (d ? dataLocal(d) : "");
  const linhas = [
    ["Tipo", "Descrição", "Parcela", "Categoria", "Cliente/Fornecedor", "Forma", "Situação", "Vencimento", "Pago em", "Valor"],
    ...lancamentos.map((l) => [
      l.tipo === "ENTRADA" ? "Entrada" : "Saída",
      l.descricao,
      l.parcela ? `${l.parcela}/${l.totalParcelas}` : "",
      l.categoria?.nome,
      l.cliente?.nome ?? l.fornecedor?.razaoSocial,
      l.forma ? FORMAS_PAGAMENTO[l.forma] : "",
      l.status,
      data(l.vencimento),
      data(l.pagoEm),
      ((l.tipo === "ENTRADA" ? 1 : -1) * Number(l.valor)).toFixed(2).replace(".", ","),
    ]),
  ];
  const csv = "﻿" + linhas.map((l) => l.map(campo).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="fluxo-de-caixa.csv"`,
    },
  });
}
