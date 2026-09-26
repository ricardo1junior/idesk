import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const [clientes, pf, pj] = await Promise.all([
    prisma.cliente.count(),
    prisma.cliente.count({ where: { tipo: "PF" } }),
    prisma.cliente.count({ where: { tipo: "PJ" } }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Início</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador titulo="Clientes" valor={clientes} />
        <Indicador titulo="Pessoa física" valor={pf} />
        <Indicador titulo="Pessoa jurídica" valor={pj} />
      </div>
      <Link href="/clientes/novo" className="btn-primario inline-block">
        Novo cliente
      </Link>
    </div>
  );
}

function Indicador({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="text-sm text-zinc-500">{titulo}</div>
      <div className="mt-1 text-3xl font-semibold">{valor}</div>
    </div>
  );
}
