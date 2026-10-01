import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Perfil } from "@prisma/client";
import { DESCRICAO_PERMISSOES, PERFIS, pode, type Permissao } from "@/lib/permissoes";
import { LinhaUsuario, NovoUsuario } from "./NovoUsuario";

const perfis = Object.keys(PERFIS) as Perfil[];

export default async function Usuarios() {
  const eu = await exigirUsuario("usuarios");
  const usuarios = await prisma.usuario.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, email: true, perfil: true, ativo: true, superAdmin: true } });

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Usuários</h1>

      <section className="rounded-lg border border-zinc-200 bg-cartao p-5">
        <h2 className="titulo-secao">Novo usuário</h2>
        <NovoUsuario />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-cartao p-5">
        <h2 className="titulo-secao">Equipe</h2>
        <div className="divide-y divide-zinc-100">
          {usuarios.map((u) => (
            <LinhaUsuario key={u.id} usuario={u} voce={u.id === eu.id} bloqueado={u.superAdmin && !eu.superAdmin} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-cartao p-5">
        <h2 className="titulo-secao">O que cada perfil pode fazer</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-zinc-500">
                <th className="py-2 text-left font-medium">Permissão</th>
                {perfis.map((p) => (
                  <th key={p} className="px-2 py-2 text-center font-medium">
                    {PERFIS[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(DESCRICAO_PERMISSOES) as Permissao[]).map((perm) => (
                <tr key={perm} className="border-t border-zinc-100">
                  <td className="py-2">{DESCRICAO_PERMISSOES[perm]}</td>
                  {perfis.map((p) => (
                    <td key={p} className="px-2 py-2 text-center">
                      {pode(p, perm) ? <span className="text-green-600" aria-label="sim">●</span> : <span className="text-zinc-300" aria-label="não">–</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
