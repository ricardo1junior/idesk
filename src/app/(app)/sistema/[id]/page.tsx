import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSuperAdmin } from "@/lib/auth";
import { atualizarCarteira, configSistema, saldoDe } from "@/lib/carteira";
import { SITUACOES } from "@/lib/carteira-regras";
import { prismaBase } from "@/lib/db";
import { formatarReais } from "@/lib/vendas";
import { FormCobrancaLoja, FormCreditoManual } from "../FormsCarteira";

const dataBr = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function CarteiraDaLoja({ params }: PageProps<"/sistema/[id]">) {
  await exigirSuperAdmin();
  const { id } = await params;
  const loja = await prismaBase.empresa.findUnique({ where: { id }, select: { id: true, nome: true, documento: true, email: true, diaria: true, isenta: true } });
  if (!loja) notFound();
  const [c, config, extrato, recargas] = await Promise.all([
    atualizarCarteira(id),
    configSistema(),
    prismaBase.movimentoCredito.findMany({ where: { empresaId: id }, orderBy: { criadoEm: "desc" }, take: 100 }),
    prismaBase.recarga.findMany({ where: { empresaId: id }, orderBy: { criadoEm: "desc" }, take: 20 }),
  ]);
  if (c.isenta) c.saldo = await saldoDe(id);
  const s = SITUACOES[c.situacao];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/sistema" className="text-sm text-link hover:underline">
          ← Lojas do sistema
        </Link>
        <h1 className="text-2xl font-semibold">{loja.nome}</h1>
        <p className="text-sm text-zinc-500">{[loja.documento, loja.email].filter(Boolean).join(" · ") || "Sem CNPJ/CPF cadastrado (precisa para recarregar)"}</p>
      </div>

      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-zinc-200 bg-cartao p-5">
        <div>
          <div className="text-sm text-zinc-500">Saldo</div>
          <div className={`text-2xl font-semibold ${c.saldo < 0 ? "text-red-600" : ""}`}>{formatarReais(c.saldo)}</div>
        </div>
        <div>
          <div className="text-sm text-zinc-500">Diária</div>
          <div className="text-2xl font-semibold">{formatarReais(c.diaria)}</div>
        </div>
        <div>
          <div className="text-sm text-zinc-500">Dias restantes</div>
          <div className="text-2xl font-semibold">{c.isenta ? "-" : c.diasRestantes}</div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs ${s.tom}`}>{s.label}</span>
      </div>

      <FormCobrancaLoja empresaId={id} diaria={loja.diaria === null ? null : Number(loja.diaria)} isenta={loja.isenta} diariaPadrao={Number(config.diariaPadrao)} />
      <FormCreditoManual empresaId={id} />

      {recargas.length > 0 && (
        <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-cartao">
          <h2 className="titulo-secao px-5 pt-5">Recargas</h2>
          <table className="w-full text-left text-sm">
            <tbody>
              {recargas.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-5 py-2 text-zinc-500">{dataBr(r.criadoEm)}</td>
                  <td className="px-5 py-2">{r.forma === "CARTAO" ? "Cartão" : r.forma === "PIX" ? "Pix" : "Boleto"}</td>
                  <td className="px-5 py-2">{r.status === "PAGA" ? `Paga em ${dataBr(r.pagaEm ?? r.criadoEm)}` : r.status === "PENDENTE" ? "Aguardando pagamento" : "Cancelada"}</td>
                  <td className="px-5 py-2 text-right">{formatarReais(Number(r.valor))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
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
