"use client";

import { useActionState } from "react";
import { criarAdministrador, entrar, type EstadoLogin } from "./actions";

export function FormLogin() {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrar, {});
  return (
    <form action={acao} className="space-y-4">
      <label className="campo">
        <span>E-mail</span>
        <input name="email" type="email" data-mascara="email" defaultValue={estado.email} autoComplete="username" required autoFocus />
      </label>
      <label className="campo">
        <span>Senha</span>
        <input name="senha" type="password" autoComplete="current-password" required />
      </label>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button className="btn-primario w-full" disabled={pendente}>
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export function FormPrimeiroAcesso({ pedirCodigo }: { pedirCodigo: boolean }) {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(criarAdministrador, {});
  return (
    <form action={acao} className="space-y-4">
      <p className="text-sm text-zinc-600">Primeiro acesso: crie o usuário administrador da loja.</p>
      {pedirCodigo && (
        <label className="campo">
          <span>Código de primeiro acesso</span>
          <input name="codigo" required autoComplete="off" />
        </label>
      )}
      <label className="campo">
        <span>Nome da loja</span>
        <input name="loja" defaultValue={estado.loja} required />
      </label>
      <label className="campo">
        <span>Seu nome</span>
        <input name="nome" data-mascara="nome" defaultValue={estado.nome} required autoFocus={!pedirCodigo} />
      </label>
      <label className="campo">
        <span>E-mail</span>
        <input name="email" type="email" data-mascara="email" defaultValue={estado.email} autoComplete="username" required />
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
        {pendente ? "Criando..." : "Criar administrador"}
      </button>
    </form>
  );
}
