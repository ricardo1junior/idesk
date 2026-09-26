import type { VendaCompleta } from "@/app/(app)/vendas/[id]/dados";
import { CONDICOES } from "@/lib/estoque";
import { FORMAS_PAGAMENTO, formatarReais, totalItem } from "@/lib/vendas";

// Itens, totais e pagamentos da venda. Usado na tela e no recibo impresso.
export function ResumoVenda({ venda }: { venda: VendaCompleta }) {
  const n = (v: { toString(): string }) => Number(v.toString());
  return (
    <div className="space-y-4 text-sm">
      <table className="w-full">
        <thead className="text-left text-zinc-500">
          <tr>
            <th className="py-1 font-medium">Item</th>
            <th className="py-1 text-right font-medium">Qtd.</th>
            <th className="py-1 text-right font-medium">Unit.</th>
            <th className="py-1 text-right font-medium">Desc.</th>
            <th className="py-1 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {venda.itens.map((i) => (
            <tr key={i.id} className="border-t border-zinc-100 align-top">
              <td className="py-1.5">
                {i.descricao}
                {i.aparelho && (
                  <div className="text-xs text-zinc-500">
                    {[i.aparelho.imei && `IMEI ${i.aparelho.imei}`, i.aparelho.serial && `Série ${i.aparelho.serial}`, CONDICOES[i.aparelho.condicao]]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
                {i.garantiaDias ? <div className="text-xs text-zinc-500">Garantia: {i.garantiaDias} dias</div> : null}
              </td>
              <td className="py-1.5 text-right">{i.quantidade}</td>
              <td className="py-1.5 text-right">{formatarReais(n(i.valorUnit))}</td>
              <td className="py-1.5 text-right">{n(i.desconto) ? `-${formatarReais(n(i.desconto))}` : "-"}</td>
              <td className="py-1.5 text-right">{formatarReais(totalItem({ quantidade: i.quantidade, valorUnit: n(i.valorUnit), desconto: n(i.desconto) }))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatarReais(n(venda.subtotal))}</span>
        </div>
        {n(venda.desconto) > 0 && (
          <div className="flex justify-between">
            <span>Desconto</span>
            <span>-{formatarReais(n(venda.desconto))}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatarReais(n(venda.total))}</span>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Pagamentos</div>
        {venda.pagamentos.map((p) => (
          <div key={p.id} className="flex justify-between border-t border-zinc-100 py-1.5">
            <span>
              {FORMAS_PAGAMENTO[p.forma]}
              {p.parcelas > 1 && ` em ${p.parcelas}x`}
              {p.aparelhoTroca && (
                <span className="block text-xs text-zinc-500">
                  {[
                    p.aparelhoTroca.modelo,
                    p.aparelhoTroca.capacidade,
                    p.aparelhoTroca.cor,
                    CONDICOES[p.aparelhoTroca.condicao],
                    p.aparelhoTroca.imei && `IMEI ${p.aparelhoTroca.imei}`,
                    p.aparelhoTroca.serial && `Série ${p.aparelhoTroca.serial}`,
                    p.aparelhoTroca.saudeBateria != null && `bateria ${p.aparelhoTroca.saudeBateria}%`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </span>
            <span>{formatarReais(n(p.valor))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
