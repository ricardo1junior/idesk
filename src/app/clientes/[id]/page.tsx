import Link from "next/link";
import { notFound } from "next/navigation";
import { ClienteForm } from "@/components/ClienteForm";
import { prisma } from "@/lib/db";
import { ExcluirCliente } from "./ExcluirCliente";

export default async function EditarCliente({ params, searchParams }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const { salvo } = await searchParams;
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) notFound();

  // O formulário trabalha com strings; datas vão no formato do input (AAAA-MM-DD).
  const inicial = Object.fromEntries(
    Object.entries(cliente).map(([k, v]) => [
      k,
      v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? "" : String(v),
    ]),
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/clientes" className="text-sm text-zinc-500 hover:underline">
            ← Clientes
          </Link>
          <h1 className="text-2xl font-semibold">{cliente.nome}</h1>
        </div>
        <div className="flex items-start gap-2">
          <Link href={`/os/nova?cliente=${cliente.id}`} className="btn-primario">
            Nova OS
          </Link>
          <ExcluirCliente id={cliente.id} />
        </div>
      </div>
      {salvo && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Cliente salvo.</div>
      )}
      <ClienteForm key={cliente.atualizadoEm.toISOString()} id={cliente.id} inicial={inicial} />
    </div>
  );
}
