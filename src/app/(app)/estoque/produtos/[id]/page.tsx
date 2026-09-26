import Link from "next/link";
import { notFound } from "next/navigation";
import { ProdutoForm } from "@/components/ProdutoForm";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CONDICOES, TIPOS_PRODUTO } from "@/lib/estoque";
import { formatarMoeda } from "@/lib/os";
import { pode } from "@/lib/permissoes";
import { EntradaAparelhoForm, MovimentoForm } from "./Formularios";

const SITUACAO: Record<string, string> = {
  EM_ESTOQUE: "Em estoque",
  VENDIDO: "Vendido",
  RESERVADO: "Reservado",
  DEVOLVIDO: "Devolvido",
  DO_CLIENTE: "Do cliente",
};

export default async function Produto({ params, searchParams }: PageProps<"/estoque/produtos/[id]">) {
  const usuario = await exigirUsuario("estoque");
  const { id } = await params;
  const { salvo } = await searchParams;
  const produto = await prisma.produto.findUnique({
    where: { id },
    include: {
      unidades: { orderBy: [{ situacao: "asc" }, { criadoEm: "desc" }], take: 100 },
      movimentos: { orderBy: { criadoEm: "desc" }, take: 30 },
    },
  });
  if (!produto) notFound();
  const editar = pode(usuario.perfil, "editarProdutos");
  const aparelho = produto.tipo === "APARELHO";
  const emEstoque = aparelho ? produto.unidades.filter((u) => u.situacao === "EM_ESTOQUE").length : produto.estoque;

  const inicial = Object.fromEntries(
    Object.entries(produto)
      .filter(([, v]) => !Array.isArray(v) || v.every((x) => typeof x === "string"))
      .map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v)]),
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/estoque" className="text-sm text-zinc-500 hover:underline">
          ← Estoque
        </Link>
        <h1 className="text-2xl font-semibold">{produto.descricao}</h1>
        <p className="text-sm text-zinc-500">
          {TIPOS_PRODUTO[produto.tipo]} · {emEstoque} em estoque · venda {formatarMoeda(produto.precoVenda)}
        </p>
      </div>
      {salvo && <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Produto salvo.</div>}

      {editar && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="titulo-secao">{aparelho ? "Entrada de aparelho (um por IMEI)" : "Entrada / ajuste de estoque"}</h2>
          {aparelho ? <EntradaAparelhoForm produtoId={produto.id} modelo={produto.modelo ?? produto.descricao} /> : <MovimentoForm produtoId={produto.id} />}
        </section>
      )}

      {aparelho && (
        <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="titulo-secao">Unidades</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-2 font-medium">IMEI / série</th>
                <th className="py-2 font-medium">Detalhes</th>
                <th className="py-2 font-medium">Condição</th>
                <th className="py-2 font-medium">Situação</th>
                <th className="py-2 text-right font-medium">Custo</th>
              </tr>
            </thead>
            <tbody>
              {produto.unidades.map((u) => (
                <tr key={u.id} className="border-t border-zinc-100">
                  <td className="py-2 font-mono text-xs">
                    {u.imei ?? "-"}
                    {u.serial && <div className="text-zinc-500">{u.serial}</div>}
                  </td>
                  <td className="py-2">
                    {[u.capacidade, u.cor, u.saudeBateria != null && `bateria ${u.saudeBateria}%`].filter(Boolean).join(" · ")}
                  </td>
                  <td className="py-2">{CONDICOES[u.condicao]}</td>
                  <td className="py-2">{SITUACAO[u.situacao]}</td>
                  <td className="py-2 text-right">{u.custo ? formatarMoeda(u.custo) : "-"}</td>
                </tr>
              ))}
              {produto.unidades.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-zinc-500">
                    Nenhuma unidade cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Movimentações</h2>
        <table className="w-full text-sm">
          <tbody>
            {produto.movimentos.map((m) => (
              <tr key={m.id} className="border-b border-zinc-100 last:border-0">
                <td className="py-2 text-zinc-500">{m.criadoEm.toLocaleString("pt-BR")}</td>
                <td className="py-2">{m.tipo.replace("_", " ").toLowerCase()}</td>
                <td className="py-2">{m.referencia}</td>
                <td className={`py-2 text-right font-medium ${m.quantidade < 0 ? "text-red-600" : "text-green-700"}`}>
                  {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}
                </td>
              </tr>
            ))}
            {produto.movimentos.length === 0 && (
              <tr>
                <td className="py-2 text-zinc-500">Sem movimentações.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {editar && (
        <details className="rounded-lg border border-zinc-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500">Editar cadastro</summary>
          <div className="mt-4">
            <ProdutoForm key={String(produto.precoVenda) + produto.descricao} id={produto.id} inicial={inicial} />
          </div>
        </details>
      )}
    </div>
  );
}
