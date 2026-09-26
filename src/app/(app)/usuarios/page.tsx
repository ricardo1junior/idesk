import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Perfil } from "@prisma/client";
import { DESCRICAO_PERMISSOES, PERFIS, pode, type Permissao } from "@/lib/permissoes";
import { alterarUsuario } from "./actions";
import { NovoUsuario } from "./NovoUsuario";

const perfis = Object.keys(PERFIS) as Perfil[];

export default async function Usuarios() {
  const eu = await exigirUsuario("usuarios");
  const usuarios = await prisma.usuario.findMany({ orderBy: { nome: "asc" } });

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Usuários</h1>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Novo usuário</h2>
        <NovoUsuario />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Equipe</h2>
        <div className="divide-y divide-zinc-100">
          {usuarios.map((u) => (
            <form
              key={u.id + u.perfil + u.ativo}
              action={alterarUsuario.bind(null, u.id)}
              className="grid items-end gap-3 py-3 sm:grid-cols-[1fr_10rem_6rem_10rem_auto]"
            >
              <div className="text-sm">
                <div className="font-medium">
                  {u.nome} {u.id === eu.id && <span className="text-xs text-zinc-500">(você)</span>}
                </div>
                <div className="text-zinc-500">{u.email}</div>
              </div>
              <label className="campo">
                <span>Perfil</span>
                <select name="perfil" defaultValue={u.perfil} disabled={u.id === eu.id}>
                  {Object.entries(PERFIS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" name="ativo" defaultChecked={u.ativo} disabled={u.id === eu.id} /> Ativo
              </label>
              <label className="campo">
                <span>Nova senha</span>
                <input name="novaSenha" type="password" minLength={8} autoComplete="new-password" placeholder="(manter)" />
              </label>
              <button className="btn-secundario">Salvar</button>
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
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
