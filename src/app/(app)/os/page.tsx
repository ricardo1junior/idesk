import { exigirUsuario } from "@/lib/auth";
import type { Prisma, StatusOS } from "@prisma/client";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";
import { formatarMoeda, STATUS_OS } from "@/lib/os";

const EM_ANDAMENTO: StatusOS[] = ["ABERTA", "EM_ANALISE", "ORCAMENTO_ENVIADO", "APROVADA", "EM_EXECUCAO", "CONCLUIDA"];

export default async function OrdensServico({ searchParams }: PageProps<"/os">) {
  await exigirUsuario("os");
  const { status, q } = await searchParams;
  const filtro = typeof status === "string" && status in STATUS_OS ? (status as StatusOS) : undefined;
  const busca = typeof q === "string" ? q.trim() : "";

  const where: Prisma.OrdemServicoWhereInput = {
    status: filtro ?? (status === "todas" ? undefined : { in: EM_ANDAMENTO }),
    ...(busca && {
      OR: [
        ...(/^\d+$/.test(busca) ? [{ numero: Number(busca) }] : []),
        { cliente: { nome: { contains: busca, mode: "insensitive" } } },
        { aparelho: { imei: { contains: busca } } },
        { aparelho: { serial: { contains: busca, mode: "insensitive" } } },
        { aparelho: { modelo: { contains: busca, mode: "insensitive" } } },
      ],
    }),
  };

  const [ordens, contagem] = await Promise.all([
    prisma.ordemServico.findMany({
      where,
      include: { cliente: { select: { nome: true } }, aparelho: { select: { modelo: true, imei: true } } },
      orderBy: { numero: "desc" },
      take: 100,
    }),
    prisma.ordemServico.groupBy({ by: ["status"], _count: true }),
  ]);
  const qtd = Object.fromEntries(contagem.map((c) => [c.status, c._count]));

  const abas = [
    { valor: undefined, label: "Em andamento" },
    ...EM_ANDAMENTO.map((s) => ({ valor: s, label: `${STATUS_OS[s].label} (${qtd[s] ?? 0})` })),
    { valor: "ENTREGUE", label: "Entregues" },
    { valor: "todas", label: "Todas" },
  ];
  const atual = typeof status === "string" ? status : undefined;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Ordens de serviço</h1>
        <Link href="/os/nova" className="btn-primario">
          Nova OS
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 text-sm">
        {abas.map((a) => (
          <Link
            key={a.label}
            href={a.valor ? `/os?status=${a.valor}` : "/os"}
            className={`whitespace-nowrap rounded-full border px-3 py-1 ${
              atual === a.valor ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white hover:bg-zinc-100"
            }`}
          >
            {a.label}
          </Link>
        ))}
      </div>

      <form className="campo max-w-md">
        {atual && <input type="hidden" name="status" value={atual} />}
        <input name="q" defaultValue={busca} placeholder="Nº da OS, cliente, modelo, IMEI ou série" />
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">OS</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Aparelho</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Previsão</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {ordens.map((os) => (
              <tr key={os.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link href={`/os/${os.id}`} className="font-medium hover:underline">
                    #{os.numero}
                  </Link>
                </td>
                <td className="px-4 py-3">{os.cliente.nome}</td>
                <td className="px-4 py-3">
                  {os.aparelho?.modelo ?? "-"}
                  {os.aparelho?.imei && <div className="font-mono text-xs text-zinc-500">{os.aparelho.imei}</div>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={os.status} />
                </td>
                <td className="px-4 py-3">{os.previsaoEntrega?.toLocaleDateString("pt-BR") ?? "-"}</td>
                <td className="px-4 py-3 text-right">{formatarMoeda(os.total)}</td>
              </tr>
            ))}
            {ordens.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  Nenhuma ordem de serviço encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
