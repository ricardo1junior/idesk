import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FORMAS_PAGAMENTO, formatarReais } from "@/lib/vendas";

export default async function Vendas({ searchParams }: PageProps<"/vendas">) {
  await exigirUsuario("vendas");
  const { q } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";

  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);

  const [vendas, hoje] = await Promise.all([
    prisma.venda.findMany({
      where: busca
        ? {
            OR: [
              ...(/^\d+$/.test(busca) ? [{ numero: Number(busca) }] : []),
              { cliente: { nome: { contains: busca, mode: "insensitive" } } },
              { itens: { some: { aparelho: { imei: { contains: busca } } } } },
            ],
          }
        : undefined,
      include: { cliente: { select: { nome: true } }, vendedor: { select: { nome: true } }, pagamentos: true, _count: { select: { itens: true } } },
      orderBy: { numero: "desc" },
      take: 100,
    }),
    prisma.venda.aggregate({ where: { status: "FINALIZADA", criadoEm: { gte: inicioDoDia } }, _sum: { total: true }, _count: true }),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Vendas</h1>
        <Link href="/vendas/nova" className="btn-primario">
          Nova venda
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-cartao p-5">
          <div className="text-sm text-zinc-500">Vendido hoje</div>
          <div className="mt-1 text-3xl font-semibold">{formatarReais(Number(hoje._sum.total ?? 0))}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-cartao p-5">
          <div className="text-sm text-zinc-500">Vendas hoje</div>
          <div className="mt-1 text-3xl font-semibold">{hoje._count}</div>
        </div>
      </div>

      <form className="campo max-w-md">
        <input name="q" defaultValue={busca} placeholder="Nº da venda, cliente ou IMEI vendido" />
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-cartao">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Venda</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Pagamento</th>
              <th className="px-4 py-3 font-medium">Vendedor</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <tr key={v.id} className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50 ${v.status === "CANCELADA" ? "text-zinc-400 line-through" : ""}`}>
                <td className="px-4 py-3">
                  <Link href={`/vendas/${v.id}`} className="font-medium hover:underline">
                    #{v.numero}
                  </Link>
                </td>
                <td className="px-4 py-3">{v.criadoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-4 py-3">{v.cliente?.nome ?? "Consumidor"}</td>
                <td className="px-4 py-3">{[...new Set(v.pagamentos.map((p) => FORMAS_PAGAMENTO[p.forma]))].join(", ")}</td>
                <td className="px-4 py-3">{v.vendedor?.nome ?? "-"}</td>
                <td className="px-4 py-3 text-right">{formatarReais(Number(v.total))}</td>
              </tr>
            ))}
            {vendas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  Nenhuma venda encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
