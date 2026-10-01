import { exigirUsuario } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import Form from "next/form";
import Link from "next/link";
import { LinkWhatsApp } from "@/components/LinkWhatsApp";
import { prisma } from "@/lib/db";
import { Paginacao } from "@/components/Paginacao";
import { formatarDocumento, somenteDigitos } from "@/lib/documentos";
import { faixaDaPagina, lerPagina, POR_PAGINA } from "@/lib/paginacao";

export default async function Clientes({ searchParams }: PageProps<"/clientes">) {
  await exigirUsuario("clientes");
  const { q, pagina } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const digitos = somenteDigitos(busca);

  const where: Prisma.ClienteWhereInput | undefined = busca
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
    : undefined;
  const total = await prisma.cliente.count({ where });
  const faixa = faixaDaPagina(lerPagina(pagina), total);
  const clientes = await prisma.cliente.findMany({ where, orderBy: [{ nome: "asc" }, { id: "asc" }], skip: faixa.pular, take: POR_PAGINA });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Link href="/clientes/novo" className="btn-primario">
          Novo cliente
        </Link>
      </div>

      <Form action="/clientes" className="flex max-w-xl flex-wrap items-center gap-2">
        <label className="campo min-w-60 flex-1">
          <input name="q" defaultValue={busca} placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail" aria-label="Buscar cliente" />
        </label>
        <button className="btn-secundario">Buscar</button>
        {busca && (
          <Link href="/clientes" className="text-sm text-link hover:underline">
            Limpar
          </Link>
        )}
      </Form>

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
      <Paginacao faixa={faixa} base="/clientes" filtros={{ q: busca || undefined }} />
    </div>
  );
}
