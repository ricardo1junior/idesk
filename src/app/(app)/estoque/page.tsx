import type { Prisma, TipoProduto } from "@prisma/client";
import Form from "next/form";
import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CONDICOES, TIPOS_PRODUTO } from "@/lib/estoque";
import { formatarMoeda } from "@/lib/os";
import { pode } from "@/lib/permissoes";
import { ImportarCatalogo } from "./ImportarCatalogo";

export default async function Estoque({ searchParams }: PageProps<"/estoque">) {
  const usuario = await exigirUsuario("estoque");
  const { tipo, q, aba } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const filtroTipo = typeof tipo === "string" && tipo in TIPOS_PRODUTO ? (tipo as TipoProduto) : undefined;
  const verAparelhos = aba === "aparelhos";

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Estoque</h1>
        {pode(usuario.perfil, "editarProdutos") && (
          <div className="flex flex-wrap items-center gap-2">
            <ImportarCatalogo />
            <Link href="/estoque/produtos/novo" className="btn-primario">
              Novo produto
            </Link>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { href: "/estoque", label: "Produtos", ativo: !verAparelhos && !filtroTipo },
          ...Object.entries(TIPOS_PRODUTO).map(([v, l]) => ({ href: `/estoque?tipo=${v}`, label: l, ativo: filtroTipo === v })),
          { href: "/estoque?aba=aparelhos", label: "Aparelhos por IMEI", ativo: verAparelhos },
        ].map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={`rounded-full border px-3 py-1 ${a.ativo ? "border-zinc-900 bg-zinc-900 text-zinc-50" : "border-zinc-300 bg-cartao hover:bg-zinc-100"}`}
          >
            {a.label}
          </Link>
        ))}
      </div>

      <Form action="/estoque" className="campo max-w-md">
        {verAparelhos && <input type="hidden" name="aba" value="aparelhos" />}
        {filtroTipo && <input type="hidden" name="tipo" value={filtroTipo} />}
        <input name="q" defaultValue={busca} placeholder={verAparelhos ? "Modelo, IMEI ou série" : "Descrição, modelo, código de barras ou SKU"} />
      </Form>

      {verAparelhos ? <ListaAparelhos busca={busca} /> : <ListaProdutos busca={busca} tipo={filtroTipo} />}
    </div>
  );
}

async function ListaProdutos({ busca, tipo }: { busca: string; tipo?: TipoProduto }) {
  const where: Prisma.ProdutoWhereInput = {
    ativo: true,
    tipo,
    ...(busca && {
      OR: [
        { descricao: { contains: busca, mode: "insensitive" } },
        { modelo: { contains: busca, mode: "insensitive" } },
        { codigoBarras: busca },
        { sku: { contains: busca, mode: "insensitive" } },
      ],
    }),
  };
  const produtos = await prisma.produto.findMany({
    where,
    include: { _count: { select: { unidades: { where: { situacao: "EM_ESTOQUE" } } } } },
    orderBy: { descricao: "asc" },
    take: 200,
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-cartao">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">Produto</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 text-right font-medium">Custo</th>
            <th className="px-4 py-3 text-right font-medium">Venda</th>
            <th className="px-4 py-3 text-right font-medium">Estoque</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => {
            const qtd = p.tipo === "APARELHO" ? p._count.unidades : p.estoque;
            const baixo = qtd <= p.estoqueMinimo;
            return (
              <tr key={p.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link href={`/estoque/produtos/${p.id}`} className="font-medium hover:underline">
                    {p.descricao}
                  </Link>
                  {p.codigoBarras && <div className="font-mono text-xs text-zinc-500">{p.codigoBarras}</div>}
                </td>
                <td className="px-4 py-3">{TIPOS_PRODUTO[p.tipo]}</td>
                <td className="px-4 py-3 text-right">{formatarMoeda(p.precoCusto)}</td>
                <td className="px-4 py-3 text-right">{formatarMoeda(p.precoVenda)}</td>
                <td className={`px-4 py-3 text-right font-medium ${baixo ? "text-red-600" : ""}`}>{qtd}</td>
              </tr>
            );
          })}
          {produtos.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                Nenhum produto encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

async function ListaAparelhos({ busca }: { busca: string }) {
  const aparelhos = await prisma.aparelho.findMany({
    where: {
      situacao: "EM_ESTOQUE",
      ...(busca && {
        OR: [
          { modelo: { contains: busca, mode: "insensitive" } },
          { imei: { contains: busca } },
          { serial: { contains: busca, mode: "insensitive" } },
        ],
      }),
    },
    include: { produto: { select: { id: true, precoVenda: true } } },
    orderBy: { criadoEm: "desc" },
    take: 200,
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-cartao">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">Aparelho</th>
            <th className="px-4 py-3 font-medium">IMEI / série</th>
            <th className="px-4 py-3 font-medium">Condição</th>
            <th className="px-4 py-3 text-right font-medium">Bateria</th>
            <th className="px-4 py-3 text-right font-medium">Custo</th>
            <th className="px-4 py-3 text-right font-medium">Venda</th>
          </tr>
        </thead>
        <tbody>
          {aparelhos.map((a) => (
            <tr key={a.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
              <td className="px-4 py-3">
                {a.produto ? (
                  <Link href={`/estoque/produtos/${a.produto.id}`} className="font-medium hover:underline">
                    {a.modelo}
                  </Link>
                ) : (
                  a.modelo
                )}
                <div className="text-xs text-zinc-500">{[a.capacidade, a.cor].filter(Boolean).join(" · ")}</div>
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {a.imei ?? "-"}
                {a.serial && <div className="text-zinc-500">{a.serial}</div>}
              </td>
              <td className="px-4 py-3">{CONDICOES[a.condicao]}</td>
              <td className="px-4 py-3 text-right">{a.saudeBateria != null ? `${a.saudeBateria}%` : "-"}</td>
              <td className="px-4 py-3 text-right">{a.custo ? formatarMoeda(a.custo) : "-"}</td>
              <td className="px-4 py-3 text-right">{a.produto ? formatarMoeda(a.produto.precoVenda) : "-"}</td>
            </tr>
          ))}
          {aparelhos.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                Nenhum aparelho em estoque.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
