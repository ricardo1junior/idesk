import { exigirUsuario } from "@/lib/auth";
import Link from "next/link";
import { LinkWhatsApp } from "@/components/LinkWhatsApp";
import { prisma } from "@/lib/db";
import { formatarDocumento, somenteDigitos } from "@/lib/documentos";

export default async function Clientes({ searchParams }: PageProps<"/clientes">) {
  await exigirUsuario("clientes");
  const { q } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const digitos = somenteDigitos(busca);

  const clientes = await prisma.cliente.findMany({
    where: busca
      ? {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            { nomeFantasia: { contains: busca, mode: "insensitive" } },
            { email: { contains: busca, mode: "insensitive" } },
            { contatos: { some: { valor: { contains: busca.toLowerCase() } } } },
            ...(digitos.length >= 3
              ? [{ documento: { contains: digitos } }, { telefone: { contains: digitos } }, { whatsapp: { contains: digitos } }, { contatos: { some: { valor: { contains: digitos } } } }]
              : []),
          ],
        }
      : undefined,
    orderBy: { nome: "asc" },
    take: 100,
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Link href="/clientes/novo" className="btn-primario">
          Novo cliente
        </Link>
      </div>

      <form className="campo max-w-md">
        <input name="q" defaultValue={busca} placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail" />
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-cartao">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">CPF/CNPJ</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Cidade</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                    {c.nome}
                  </Link>
                  {c.nomeFantasia && <div className="text-xs text-zinc-500">{c.nomeFantasia}</div>}
                </td>
                <td className="px-4 py-3">{c.tipo}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatarDocumento(c.documento)}</td>
                <td className="px-4 py-3">{c.whatsapp || c.telefone ? <LinkWhatsApp telefone={c.whatsapp || c.telefone!} /> : "-"}</td>
                <td className="px-4 py-3">{c.cidade ? `${c.cidade}/${c.uf ?? ""}` : "-"}</td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                  {busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
