import { exigirUsuario } from "@/lib/auth";
import Link from "next/link";
import { OSForm } from "@/components/OSForm";
import { prisma } from "@/lib/db";

export default async function NovaOS({ searchParams }: PageProps<"/os/nova">) {
  await exigirUsuario("os");
  const { cliente: clienteId } = await searchParams;
  const cliente =
    typeof clienteId === "string"
      ? await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true, nome: true, documento: true } })
      : null;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/os" className="text-sm text-zinc-500 hover:underline">
          ← Ordens de serviço
        </Link>
        <h1 className="text-2xl font-semibold">Nova ordem de serviço</h1>
      </div>
      <OSForm cliente={cliente ?? undefined} />
    </div>
  );
}
