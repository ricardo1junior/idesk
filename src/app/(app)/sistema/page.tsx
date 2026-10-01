import { exigirSuperAdmin } from "@/lib/auth";
import { prismaBase } from "@/lib/db";
import { FormNovaLoja } from "./FormNovaLoja";
import { alternarLoja } from "./actions";

export default async function LojasDoSistema() {
  const eu = await exigirSuperAdmin();
  const [lojas, usuarios, vendas, ordens] = await Promise.all([
    prismaBase.empresa.findMany({ orderBy: { criadoEm: "asc" }, omit: { logo: true, smtpSenha: true } }),
    prismaBase.usuario.groupBy({ by: ["empresaId"], _count: true }),
    prismaBase.venda.groupBy({ by: ["empresaId"], _count: true }),
    prismaBase.ordemServico.groupBy({ by: ["empresaId"], _count: true }),
  ]);
  const conta = (lista: { empresaId: string; _count: number }[], id: string) => lista.find((x) => x.empresaId === id)?._count ?? 0;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lojas do sistema</h1>
        <p className="text-sm text-zinc-500">Só você vê esta tela. Cada loja enxerga apenas os próprios dados.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-cartao">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Loja</th>
              <th className="px-4 py-3 font-medium">Desde</th>
              <th className="px-4 py-3 text-right font-medium">Usuários</th>
              <th className="px-4 py-3 text-right font-medium">Vendas</th>
              <th className="px-4 py-3 text-right font-medium">OS</th>
              <th className="px-4 py-3 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody>
            {lojas.map((l) => (
              <tr key={l.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <div className="font-medium">{l.nome}</div>
                  {l.email && <div className="text-xs text-zinc-500">{l.email}</div>}
                </td>
                <td className="px-4 py-3">{l.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                <td className="px-4 py-3 text-right">{conta(usuarios, l.id)}</td>
                <td className="px-4 py-3 text-right">{conta(vendas, l.id)}</td>
                <td className="px-4 py-3 text-right">{conta(ordens, l.id)}</td>
                <td className="px-4 py-3">
                  {l.id === eu.empresaId ? (
                    <span className="text-xs text-zinc-500">Sua loja</span>
                  ) : (
                    <form action={alternarLoja.bind(null, l.id)} className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${l.ativa ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{l.ativa ? "Ativa" : "Bloqueada"}</span>
                      <button className="text-xs text-link hover:underline">{l.ativa ? "Bloquear" : "Desbloquear"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormNovaLoja />
    </div>
  );
}
