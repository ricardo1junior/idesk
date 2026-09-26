import Link from "next/link";
import { notFound } from "next/navigation";
import { EnviarEmail } from "@/components/EnviarEmail";
import { LinkWhatsApp } from "@/components/LinkWhatsApp";
import { ResumoVenda } from "@/components/ResumoVenda";
import { exigirUsuario } from "@/lib/auth";
import { formatarDocumento } from "@/lib/documentos";
import { prisma } from "@/lib/db";
import { linkFocus } from "@/lib/nfe/focus";
import { pode } from "@/lib/permissoes";
import { enviarEmailVenda } from "../../email/actions";
import { CancelarVenda } from "./CancelarVenda";
import { carregarVenda } from "./dados";
import { NotasDaVenda } from "./NotasDaVenda";

export default async function DetalheVenda({ params }: PageProps<"/vendas/[id]">) {
  const usuario = await exigirUsuario("vendas");
  const { id } = await params;
  const venda = await carregarVenda(id);
  if (!venda) notFound();
  const cancelada = venda.status === "CANCELADA";
  const [notas, empresa] = await Promise.all([
    prisma.notaFiscal.findMany({ where: { vendaId: id }, orderBy: { criadoEm: "asc" } }),
    prisma.empresaFiscal.findUnique({ where: { id: "empresa" }, select: { uf: true } }),
  ]);
  // NF-e para empresa com IE ou cliente de outro estado; NFC-e no balcão.
  const sugerido =
    venda.cliente && ((venda.cliente.tipo === "PJ" && venda.cliente.inscricaoEstadual) || (empresa && venda.cliente.uf && venda.cliente.uf !== empresa.uf))
      ? "NFE"
      : "NFCE";

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
        <div className="flex flex-wrap items-start gap-2">
          <Link href={`/vendas/${venda.id}/imprimir`} className="btn-secundario">
            Imprimir recibo
          </Link>
          {venda.cliente && !cancelada && pode(usuario.perfil, "entregas") && (
            <Link href={`/entregas/nova?cliente=${venda.cliente.id}&venda=${venda.id}`} className="btn-secundario">
              Agendar entrega
            </Link>
          )}
          {venda.cliente && (
            <EnviarEmail
              emails={[...new Set([venda.cliente.email, ...venda.cliente.contatos.filter((c) => c.tipo === "EMAIL").map((c) => c.valor)].filter((e): e is string => !!e))]}
              enviar={enviarEmailVenda.bind(null, venda.id)}
            />
          )}
          {!cancelada && pode(usuario.perfil, "cancelarVenda") && <CancelarVenda id={venda.id} />}
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Cliente</h2>
        {venda.cliente ? (
          <Link href={`/clientes/${venda.cliente.id}`} className="font-medium hover:underline">
            {venda.cliente.nome} <span className="font-mono text-xs text-zinc-500">{formatarDocumento(venda.cliente.documento)}</span>
          </Link>
        ) : null}
        {venda.cliente && (venda.cliente.whatsapp || venda.cliente.telefone) && (
          <div className="mt-1 text-sm">
            <LinkWhatsApp telefone={(venda.cliente.whatsapp || venda.cliente.telefone)!} />
          </div>
        )}
        {!venda.cliente && <span className="text-sm">Consumidor não identificado</span>}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Itens e pagamento</h2>
        <ResumoVenda venda={venda} />
        {venda.observacoes && <p className="mt-4 text-sm text-zinc-600">Obs.: {venda.observacoes}</p>}
      </section>

      {(notas.length > 0 || !cancelada) && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="titulo-secao">Nota fiscal</h2>
          <NotasDaVenda
            vendaId={venda.id}
            sugerido={sugerido}
            podeEmitir={!cancelada && pode(usuario.perfil, "emitirNota")}
            podeCancelar={pode(usuario.perfil, "cancelarVenda")}
            notas={notas.map((n) => ({
              id: n.id,
              modelo: n.modelo,
              status: n.status,
              numero: n.numero,
              serie: n.serie,
              chave: n.chave,
              mensagem: n.mensagem,
              danfe: linkFocus(n.ambiente, n.caminhoDanfe),
              xml: linkFocus(n.ambiente, n.caminhoXml),
              homologacao: n.ambiente === "HOMOLOGACAO",
              criadoEm: n.criadoEm.toISOString(),
            }))}
          />
        </section>
      )}
    </div>
  );
}
