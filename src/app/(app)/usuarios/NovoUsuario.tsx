"use client";

import { useActionState } from "react";
import { PERFIS } from "@/lib/permissoes";
import { criarUsuario, type EstadoUsuario } from "./actions";

export function NovoUsuario() {
  const [estado, acao, pendente] = useActionState<EstadoUsuario, FormData>(criarUsuario, {});
  return (
    <form action={acao} key={estado.ok} className="grid items-end gap-3 sm:grid-cols-5">
      <label className="campo">
        <span>Nome</span>
        <input name="nome" required />
      </label>
      <label className="campo sm:col-span-2">
        <span>E-mail</span>
        <input name="email" type="email" required />
      </label>
      <label className="campo">
        <span>Perfil</span>
        <select name="perfil" defaultValue="VENDEDOR">
          {Object.entries(PERFIS).map(([v, l]) => (
            <option key={v} value={v}>
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
          Criar usuário
        </button>
        {estado.erro && <span className="text-sm text-red-600">{estado.erro}</span>}
        {estado.ok && <span className="text-sm text-green-700">{estado.ok}</span>}
      </div>
    </form>
  );
}
