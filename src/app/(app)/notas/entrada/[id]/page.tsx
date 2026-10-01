import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatarDocumento } from "@/lib/documentos";
import { lerXmlNFe } from "@/lib/nfe/ler-xml";
import { formatarReais } from "@/lib/vendas";
import { dataLocal } from "@/lib/tempo";

export default async function NotaEntrada({ params }: PageProps<"/notas/entrada/[id]">) {
  await exigirUsuario("notasFiscais");
  const { id } = await params;
  const nota = await prisma.notaEntrada.findUnique({
    where: { id },
    include: { fornecedor: true, lancamentos: { orderBy: { vencimento: "asc" } } },
  });
  if (!nota) notFound();
  const lida = lerXmlNFe(nota.xml);
  const movimentos = await prisma.movimentoEstoque.findMany({
    where: { notaEntradaId: nota.id },
    include: { produto: { select: { id: true, descricao: true } } },
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/notas" className="text-sm text-zinc-500 hover:underline">
            ← Notas fiscais
          </Link>
          <h1 className="text-2xl font-semibold">
            NF {nota.numero}/{nota.serie}
          </h1>
          <p className="text-sm text-zinc-500">
            {nota.fornecedor.razaoSocial} · {formatarDocumento(nota.fornecedor.cnpj)} · emitida em {dataLocal(nota.emissao)}
          </p>
        </div>
        <a href={`/notas/entrada/${nota.id}/xml`} className="btn-secundario">
          Baixar XML
        </a>
      </div>
      <p className="break-all text-xs text-zinc-500">Chave {nota.chave}</p>

      <section className="rounded-lg border border-zinc-200 bg-cartao p-5">
        <h2 className="titulo-secao">Entradas no estoque</h2>
        {movimentos.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum item deu entrada.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {movimentos.map((m) => (
                <tr key={m.id} className="border-t border-zinc-100 first:border-0">
                  <td className="py-2">
                    <Link href={`/estoque/produtos/${m.produto.id}`} className="underline">
                      {m.produto.descricao}
                    </Link>
                  </td>
                  <td className="py-2 text-right">{m.quantidade} un.</td>
                  <td className="py-2 text-right">{formatarReais(Number(m.custoUnit ?? 0))} cada</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-zinc-500">{lida.itens.length} item(ns) na nota · total {formatarReais(Number(nota.valorTotal))}</p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-cartao p-5">
        <h2 className="titulo-secao">Contas a pagar</h2>
        <table className="w-full text-sm">
          <tbody>
            {nota.lancamentos.map((l) => (
              <tr key={l.id} className="border-t border-zinc-100 first:border-0">
                <td className="py-2">{l.descricao}</td>
                <td className="py-2">vence {dataLocal(l.vencimento)}</td>
                <td className="py-2">{l.status === "PAGO" ? "Pago" : l.status === "CANCELADO" ? "Cancelado" : "Em aberto"}</td>
                <td className="py-2 text-right">{formatarReais(Number(l.valor))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link href="/financeiro?base=vencimento&periodo=30dias&tipo=SAIDA" className="mt-3 inline-block text-sm underline">
          Ver no financeiro
        </Link>
      </section>
    </div>
  );
}
