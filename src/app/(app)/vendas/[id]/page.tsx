import Link from "next/link";
import { notFound } from "next/navigation";
import { ResumoVenda } from "@/components/ResumoVenda";
import { exigirUsuario } from "@/lib/auth";
import { formatarDocumento } from "@/lib/documentos";
import { pode } from "@/lib/permissoes";
import { CancelarVenda } from "./CancelarVenda";
import { carregarVenda } from "./dados";

export default async function DetalheVenda({ params }: PageProps<"/vendas/[id]">) {
  const usuario = await exigirUsuario("vendas");
  const { id } = await params;
  const venda = await carregarVenda(id);
  if (!venda) notFound();
  const cancelada = venda.status === "CANCELADA";

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/vendas" className="text-sm text-zinc-500 hover:underline">
            ← Vendas
          </Link>
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            Venda #{venda.numero}
            {cancelada && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Cancelada</span>}
          </h1>
          <p className="text-sm text-zinc-500">
            {venda.criadoEm.toLocaleString("pt-BR")} · vendedor {venda.vendedor?.nome ?? "-"}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Link href={`/vendas/${venda.id}/imprimir`} className="btn-secundario">
            Imprimir recibo
          </Link>
          {!cancelada && pode(usuario.perfil, "cancelarVenda") && <CancelarVenda id={venda.id} />}
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Cliente</h2>
        {venda.cliente ? (
          <Link href={`/clientes/${venda.cliente.id}`} className="font-medium hover:underline">
            {venda.cliente.nome} <span className="font-mono text-xs text-zinc-500">{formatarDocumento(venda.cliente.documento)}</span>
          </Link>
        ) : (
          <span className="text-sm">Consumidor não identificado</span>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Itens e pagamento</h2>
        <ResumoVenda venda={venda} />
        {venda.observacoes && <p className="mt-4 text-sm text-zinc-600">Obs.: {venda.observacoes}</p>}
      </section>
    </div>
  );
}
