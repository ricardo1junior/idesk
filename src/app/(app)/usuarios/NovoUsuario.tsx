"use client";

import type { Perfil } from "@prisma/client";
import { useActionState } from "react";
import { Entrada } from "@/components/Entrada";
import { PERFIS } from "@/lib/permissoes";
import { alterarUsuario, criarUsuario, type EstadoUsuario } from "./actions";

export function NovoUsuario() {
  const [estado, acao, pendente] = useActionState<EstadoUsuario, FormData>(criarUsuario, {});
  const v = estado.valores ?? {};
  return (
    <form action={acao} key={estado.ok} className="grid items-end gap-3 sm:grid-cols-5">
      <label className="campo">
        <span>Nome</span>
        <Entrada mascara="nome" name="nome" defaultValue={v.nome} required />
      </label>
      <label className="campo sm:col-span-2">
        <span>E-mail</span>
        <Entrada mascara="email" name="email" defaultValue={v.email} required />
      </label>
      <label className="campo">
        <span>Perfil</span>
        <select name="perfil" defaultValue={v.perfil ?? "VENDEDOR"} key={v.perfil}>
          {Object.entries(PERFIS).map(([valor, l]) => (
            <option key={valor} value={valor}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Senha inicial</span>
        <input name="senha" type="password" minLength={8} autoComplete="new-password" required />
      </label>
      <div className="flex items-center gap-3 sm:col-span-5">
        <button className="btn-primario" disabled={pendente}>
          {pendente ? "Criando..." : "Criar usuário"}
        </button>
        {estado.erro && <span className="text-sm text-red-600">{estado.erro}</span>}
        {estado.ok && <span className="text-sm text-green-700">{estado.ok}</span>}
      </div>
    </form>
  );
}

type Linha = { id: string; nome: string; email: string; perfil: Perfil; ativo: boolean };

export function LinhaUsuario({ usuario: u, voce, bloqueado }: { usuario: Linha; voce: boolean; bloqueado: boolean }) {
  const [estado, acao, pendente] = useActionState<EstadoUsuario, FormData>(alterarUsuario.bind(null, u.id), {});
  return (
    <form action={acao} className="grid items-end gap-3 py-3 sm:grid-cols-[1fr_10rem_6rem_10rem_auto]">
      <div className="text-sm">
        <div className="font-medium">
          {u.nome} {voce && <span className="text-xs text-zinc-500">(você)</span>}
        </div>
        <div className="text-zinc-500">{u.email}</div>
        {estado.erro && <div className="text-xs text-red-600">{estado.erro}</div>}
        {estado.ok && <div className="text-xs text-green-700">{estado.ok}</div>}
      </div>
      <label className="campo">
        <span>Perfil</span>
        <select name="perfil" defaultValue={u.perfil} disabled={voce || bloqueado}>
          {Object.entries(PERFIS).map(([valor, l]) => (
            <option key={valor} value={valor}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="ativo" defaultChecked={u.ativo} disabled={voce || bloqueado} /> Ativo
      </label>
      <label className="campo">
        <span>Nova senha</span>
        <input name="novaSenha" type="password" minLength={8} autoComplete="new-password" placeholder="(manter)" disabled={bloqueado} />
      </label>
      <button className="btn-secundario" disabled={pendente || bloqueado}>
        {pendente ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
