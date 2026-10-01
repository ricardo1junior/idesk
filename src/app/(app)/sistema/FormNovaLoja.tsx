"use client";

import { useActionState } from "react";
import { Campo } from "@/components/Campos";
import type { EstadoFormulario } from "@/lib/clientes";
import { criarLoja } from "./actions";

export function FormNovaLoja() {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(criarLoja, {});
  const v = (c: string) => estado.valores?.[c] ?? "";
  const erro = (c: string) => estado.erros?.[c];
  return (
    <form action={acao} key={estado.mensagem} className="grid gap-4 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-4">
      <h2 className="titulo-secao sm:col-span-4">Nova loja</h2>
      <Campo label="Nome da loja" erro={erro("loja")} className="sm:col-span-4">
        <input name="loja" defaultValue={v("loja")} required />
      </Campo>
      <Campo label="Administrador da loja" erro={erro("nome")}>
        <input name="nome" defaultValue={v("nome")} required />
      </Campo>
      <Campo label="E-mail de acesso" erro={erro("email")}>
        <input name="email" type="email" defaultValue={v("email")} autoComplete="off" required />
      </Campo>
      <Campo label="Senha inicial" erro={erro("senha")} className="sm:col-span-2" dica="Passe para o lojista; ele pode trocar depois">
        <input name="senha" type="text" autoComplete="off" minLength={8} required />
      </Campo>
      <div className="flex items-center gap-3 sm:col-span-4">
        <button className="btn-primario" disabled={pendente}>
          {pendente ? "Criando..." : "Criar loja"}
        </button>
        {estado.mensagem && <span className="text-sm text-green-700">{estado.mensagem}</span>}
      </div>
    </form>
  );
}
