import { asaasConfigurado } from "@/lib/asaas";
import { exigirUsuario } from "@/lib/auth";
import { carteiraDaLoja, configSistema } from "@/lib/carteira";
import { SITUACOES } from "@/lib/carteira-regras";
import { prismaBase } from "@/lib/db";
import { formatarReais } from "@/lib/vendas";
import { FormRecarga, RecargaPendente } from "./Componentes";

const dataBr = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function Assinatura() {
  const usuario = await exigirUsuario("assinatura");
  const [c, config, pendentes, extrato] = await Promise.all([
    carteiraDaLoja(usuario.empresaId),
    configSistema(),
    prismaBase.recarga.findMany({ where: { empresaId: usuario.empresaId, status: "PENDENTE" }, orderBy: { criadoEm: "desc" }, take: 5 }),
    prismaBase.movimentoCredito.findMany({ where: { empresaId: usuario.empresaId }, orderBy: { criadoEm: "desc" }, take: 60 }),
  ]);
  const s = SITUACOES[c.situacao];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Assinatura</h1>
        <p className="text-sm text-zinc-500">O sistema funciona com créditos: cada dia de uso desconta a diária do saldo.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-cartao p-5">
          <div className="text-sm text-zinc-500">Saldo</div>
          <div className={`text-3xl font-semibold ${c.saldo < 0 ? "text-red-600" : ""}`}>{c.isenta ? "-" : formatarReais(c.saldo)}</div>
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${s.tom}`}>{s.label}</span>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-cartao p-5">
          <div className="text-sm text-zinc-500">Diária</div>
          <div className="text-3xl font-semibold">{c.isenta ? "Grátis" : formatarReais(c.diaria)}</div>
          {!c.isenta && <div className="mt-2 text-xs text-zinc-500">cerca de {formatarReais(c.diaria * 30)} por mês</div>}
        </div>
        <div className="rounded-lg border border-zinc-200 bg-cartao p-5">
          <div className="text-sm text-zinc-500">Dá para usar por</div>
          <div className="text-3xl font-semibold">{c.isenta ? "Sem limite" : `${c.diasRestantes} ${c.diasRestantes === 1 ? "dia" : "dias"}`}</div>
          {c.situacao === "TOLERANCIA" && <div className="mt-2 text-xs text-amber-700">Saldo esgotado: recarregue para não entrar em modo consulta.</div>}
          {c.situacao === "CONSULTA" && <div className="mt-2 text-xs text-red-600">Modo consulta: dá para ver tudo, mas não cadastrar nada.</div>}
        </div>
      </div>

      {!c.isenta && (
        <>
          {pendentes.map((r) => (
            <RecargaPendente
              key={r.id}
              recarga={{ id: r.id, valor: Number(r.valor), forma: r.forma, link: r.link, pixCopiaCola: r.pixCopiaCola, pixQrCode: r.pixQrCode, vencimento: r.vencimento.toLocaleDateString("pt-BR", { timeZone: "UTC" }) }}
            />
          ))}
          <FormRecarga diaria={c.diaria} minimo={Number(config.recargaMinima)} disponivel={asaasConfigurado()} />
        </>
      )}

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-cartao">
        <h2 className="titulo-secao px-5 pt-5">Extrato</h2>
        <table className="w-full text-left text-sm">
          <tbody>
            {extrato.map((m) => (
              <tr key={m.id} className="border-t border-zinc-100">
                <td className="px-5 py-2 text-zinc-500">{dataBr(m.criadoEm)}</td>
                <td className="px-5 py-2">{m.descricao}</td>
                <td className={`px-5 py-2 text-right ${Number(m.valor) < 0 ? "text-red-600" : "text-green-700"}`}>
                  {Number(m.valor) > 0 && "+ "}
                  {formatarReais(Number(m.valor))}
                </td>
              </tr>
            ))}
            {!extrato.length && (
              <tr>
                <td className="px-5 py-4 text-zinc-500">Nenhuma movimentação ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
