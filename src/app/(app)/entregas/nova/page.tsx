import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { configLoja } from "@/lib/loja";
import { FormEntrega } from "./FormEntrega";

export default async function NovaEntrega({ searchParams }: PageProps<"/entregas/nova">) {
  await exigirUsuario("entregas");
  const sp = await searchParams;
  const texto = (v: unknown) => (typeof v === "string" ? v : undefined);
  const [cliente, usuarios, loja] = await Promise.all([
    texto(sp.cliente) ? prisma.cliente.findUnique({ where: { id: texto(sp.cliente) }, select: { id: true, nome: true } }) : null,
    prisma.usuario.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    configLoja(),
  ]);
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/entregas" className="text-sm text-zinc-500 hover:underline">
          ← Entregas
        </Link>
        <h1 className="text-2xl font-semibold">Nova entrega ou coleta</h1>
        {!loja.endereco && (
          <p className="mt-1 text-sm text-amber-700">
            Cadastre o endereço da loja em <Link href="/configuracoes" className="underline">Configurações</Link> para calcular o tempo de ida e volta.
          </p>
        )}
      </div>
      <FormEntrega cliente={cliente ?? undefined} vendaId={texto(sp.venda)} osId={texto(sp.os)} usuarios={usuarios} />
    </div>
  );
}
