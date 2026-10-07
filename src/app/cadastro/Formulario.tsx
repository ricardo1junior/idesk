"use client";

import { useActionState } from "react";
import { Entrada } from "@/components/Entrada";
import { cadastrarLoja, type EstadoCadastro } from "./actions";

export function FormCadastro({ pedirCodigo }: { pedirCodigo: boolean }) {
  const [estado, acao, pendente] = useActionState<EstadoCadastro, FormData>(cadastrarLoja, {});
  const v = (c: string) => estado.valores?.[c] ?? "";
  return (
    <form action={acao} className="space-y-4">
      {pedirCodigo && (
        <label className="campo">
          <span>Código de cadastro</span>
          <input name="codigo" required autoComplete="off" />
        </label>
      )}
      <label className="campo">
        <span>Nome da loja</span>
        <input name="loja" defaultValue={v("loja")} required autoFocus={!pedirCodigo} />
      </label>
      <label className="campo">
        <span>Seu nome</span>
        <Entrada mascara="nome" name="nome" defaultValue={v("nome")} required />
      </label>
      <label className="campo">
        <span>E-mail</span>
        <Entrada mascara="email" name="email" defaultValue={v("email")} autoComplete="username" required />
      </label>
      <label className="campo">
        <span>Senha (mínimo 8 caracteres)</span>
        <input name="senha" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="campo">
        <span>Confirme a senha</span>
        <input name="confirmacao" type="password" autoComplete="new-password" required />
      </label>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button className="btn-primario w-full" disabled={pendente}>
        {pendente ? "Criando sua loja..." : "Criar minha loja"}
      </button>
    </form>
  );
}
