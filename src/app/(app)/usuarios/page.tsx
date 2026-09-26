import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PERFIS } from "@/lib/permissoes";
import { alterarUsuario } from "./actions";
import { NovoUsuario } from "./NovoUsuario";

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

      <section className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
        <h2 className="titulo-secao">O que cada perfil pode fazer</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Administrador:</b> tudo, incluindo usuários, excluir clientes e cancelar vendas.</li>
          <li><b>Vendedor:</b> clientes, vendas, ordens de serviço e consulta de estoque.</li>
          <li><b>Técnico:</b> clientes, ordens de serviço (e ver a senha do aparelho) e consulta de estoque.</li>
          <li><b>Financeiro:</b> clientes, vendas (incluindo cancelar), estoque e preços de produtos.</li>
        </ul>
      </section>
    </div>
  );
}
