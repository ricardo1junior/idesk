import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/app/(app)/os/[id]/imprimir/BotaoImprimir";
import { ResumoVenda } from "@/components/ResumoVenda";
import { exigirUsuario } from "@/lib/auth";
import { formatarDocumento } from "@/lib/documentos";
import { CONDICOES } from "@/lib/estoque";
import { formatarReais } from "@/lib/vendas";
import { carregarVenda } from "../dados";

export default async function ReciboVenda({ params }: PageProps<"/vendas/[id]/imprimir">) {
  await exigirUsuario("vendas");
  const { id } = await params;
  const venda = await carregarVenda(id);
  if (!venda) notFound();
  const c = venda.cliente;
  const trocas = venda.pagamentos.filter((p) => p.aparelhoTroca);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm print:max-w-none print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <BotaoImprimir />
      </div>
      <header className="mb-4 flex items-start justify-between border-b-2 border-zinc-900 pb-3">
        <div>
          <div className="text-xl font-bold">iDesk</div>
          <div className="text-xs text-zinc-500">Recibo de venda (não é documento fiscal)</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">Venda #{venda.numero}</div>
          <div className="text-xs">{venda.criadoEm.toLocaleString("pt-BR")}</div>
          {venda.status === "CANCELADA" && <div className="text-xs font-bold text-red-700">CANCELADA</div>}
        </div>
      </header>

      <section className="mb-4">
        <h2 className="mb-1 border-b border-zinc-300 text-xs font-bold">Cliente</h2>
        {c ? (
          <div>
            {c.nome} · {c.tipo === "PF" ? "CPF" : "CNPJ"} {formatarDocumento(c.documento)}
          </div>
        ) : (
          <div>Consumidor não identificado</div>
        )}
      </section>

      <section className="mb-4">
        <h2 className="mb-1 border-b border-zinc-300 text-xs font-bold">Itens e pagamento</h2>
        <ResumoVenda venda={venda} />
      </section>

      {trocas.map((p) => {
        const a = p.aparelhoTroca!;
        return (
          <section key={p.id} className="mb-4 break-inside-avoid">
            <h2 className="mb-1 border-b border-zinc-300 text-xs font-bold">Termo de entrega de aparelho usado na troca</h2>
            <p className="text-xs leading-relaxed">
              Eu, {c?.nome}, {c?.tipo === "PF" ? "CPF" : "CNPJ"} {c && formatarDocumento(c.documento)}, declaro ser o legítimo proprietário do aparelho{" "}
              <b>
                {[a.modelo, a.capacidade, a.cor].filter(Boolean).join(" ")}
                {a.imei && `, IMEI ${a.imei}`}
                {a.serial && `, série ${a.serial}`}
              </b>
              , em condição {CONDICOES[a.condicao].toLowerCase()}, e que ele não tem origem ilícita, restrição de operadora nem bloqueio de conta iCloud.
              Entrego o aparelho como parte do pagamento desta compra pelo valor de <b>{formatarReais(Number(p.valor))}</b> e autorizo a loja a
              revendê-lo. Declaro que removi minha conta iCloud e fiz backup dos meus dados.
            </p>
          </section>
        );
      })}

      <section className="mb-4 text-xs text-zinc-700">
        A garantia de cada item está indicada acima e conta a partir desta data. Guarde este recibo. A nota fiscal é emitida separadamente.
      </section>

      <div className="mt-12 grid grid-cols-2 gap-12 text-center text-xs">
        <div className="border-t border-zinc-900 pt-1">Assinatura do cliente</div>
        <div className="border-t border-zinc-900 pt-1">Responsável pela loja</div>
      </div>
    </div>
  );
}
