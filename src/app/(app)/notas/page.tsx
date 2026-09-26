import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatarDocumento } from "@/lib/documentos";
import { formatarReais } from "@/lib/vendas";

export default async function Notas() {
  await exigirUsuario("notasFiscais");
  const [entradas, emitidas] = await Promise.all([
    prisma.notaEntrada.findMany({ include: { fornecedor: true }, orderBy: { criadoEm: "desc" }, take: 100 }),
    prisma.notaFiscal.findMany({ include: { venda: { include: { cliente: { select: { nome: true } } } } }, orderBy: { criadoEm: "desc" }, take: 100 }),
  ]);
  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Notas fiscais</h1>
        <div className="flex gap-2">
          <Link href="/notas/configuracao" className="btn-secundario">
            Dados fiscais da empresa
          </Link>
          <Link href="/notas/entrada/nova" className="btn-primario">
            Importar XML de compra
          </Link>
        </div>
      </div>

      <section>
        <h2 className="titulo-secao">Notas emitidas</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-cartao">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2">Modelo</th>
                <th className="px-4 py-2">Número</th>
                <th className="px-4 py-2">Venda</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Situação</th>
                <th className="px-4 py-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {emitidas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                    Nenhuma nota emitida. Emita pela tela da venda.
                  </td>
                </tr>
              )}
              {emitidas.map((n) => (
                <tr key={n.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2">{n.modelo === "NFCE" ? "NFC-e" : "NF-e"}</td>
                  <td className="px-4 py-2">{n.numero ? `${n.numero}/${n.serie}` : "-"}</td>
                  <td className="px-4 py-2">
                    <Link href={`/vendas/${n.vendaId}`} className="underline">
                      #{n.venda.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{n.venda.cliente?.nome ?? "Consumidor final"}</td>
                  <td className="px-4 py-2">{SITUACAO_NOTA[n.status]}</td>
                  <td className="px-4 py-2">{n.criadoEm.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="titulo-secao">Notas de entrada (compras)</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-cartao">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2">Número</th>
                <th className="px-4 py-2">Fornecedor</th>
                <th className="px-4 py-2">Emissão</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2">Importada em</th>
              </tr>
            </thead>
            <tbody>
              {entradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    Nenhuma nota importada.
                  </td>
                </tr>
              )}
              {entradas.map((n) => (
                <tr key={n.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2">
                    <Link href={`/notas/entrada/${n.id}`} className="underline">
                      {n.numero}/{n.serie}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    {n.fornecedor.nomeFantasia ?? n.fornecedor.razaoSocial}
                    <div className="text-xs text-zinc-500">{formatarDocumento(n.fornecedor.cnpj)}</div>
                  </td>
                  <td className="px-4 py-2">{n.emissao.toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right">{formatarReais(Number(n.valorTotal))}</td>
                  <td className="px-4 py-2">{n.criadoEm.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const SITUACAO_NOTA = {
  PROCESSANDO: "Processando",
  AUTORIZADA: "Autorizada",
  REJEITADA: "Rejeitada",
  CANCELADA: "Cancelada",
  ERRO: "Erro",
} as const;
