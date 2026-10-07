"use client";

import { useActionState, useState, useTransition } from "react";
import { Campo } from "@/components/Campos";
import { Entrada } from "@/components/Entrada";
import type { EstadoFormulario } from "@/lib/clientes";
import { COR_PADRAO } from "@/lib/empresa-dados";
import { enviarLogo, removerLogo, salvarDadosLoja } from "./actions";

export type DadosLoja = Record<
  "nome" | "razaoSocial" | "documento" | "telefone" | "email" | "endereco" | "site" | "corDestaque" | "smtpHost" | "smtpPorta" | "smtpUsuario" | "emailRemetente",
  string
> & { smtpSeguro: boolean; temSenhaSmtp: boolean };

export function FormDadosLoja({ inicial, logo }: { inicial: DadosLoja; logo: string | null }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(salvarDadosLoja, {});
  const v = (c: keyof DadosLoja) => estado.valores?.[c] ?? String(inicial[c] ?? "");
  const erro = (c: string) => estado.erros?.[c];
  const [cor, setCor] = useState(inicial.corDestaque || COR_PADRAO);

  return (
    <div className="space-y-6">
      <LogoDaLoja logo={logo} />
      <form action={acao} className="space-y-6">
        <section className="grid gap-4 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-4">
          <h2 className="titulo-secao sm:col-span-4">Dados da loja</h2>
          <Campo label="Nome da loja" erro={erro("nome")} className="sm:col-span-2" dica="Aparece no menu, na impressão e nos e-mails">
            <input name="nome" defaultValue={v("nome")} required />
          </Campo>
          <Campo label="Razão social" className="sm:col-span-2">
            <input name="razaoSocial" defaultValue={v("razaoSocial")} />
          </Campo>
          <Campo label="CNPJ ou CPF" erro={erro("documento")}>
            <Entrada mascara="cpfCnpj" name="documento" defaultValue={v("documento")} />
          </Campo>
          <Campo label="Telefone / WhatsApp" erro={erro("telefone")}>
            <Entrada mascara="telefone" name="telefone" defaultValue={v("telefone")} />
          </Campo>
          <Campo label="E-mail de contato" erro={erro("email")} className="sm:col-span-2" dica="As respostas dos clientes chegam aqui">
            <Entrada mascara="email" name="email" defaultValue={v("email")} />
          </Campo>
          <Campo label="Endereço (para impressão)" className="sm:col-span-3">
            <input name="endereco" defaultValue={v("endereco")} placeholder="Rua, número, bairro, cidade - UF" />
          </Campo>
          <Campo label="Site ou Instagram">
            <input name="site" defaultValue={v("site")} />
          </Campo>
          <Campo label="Cor de destaque" erro={erro("corDestaque")} dica="Botões e itens selecionados">
            <span className="flex items-center gap-2">
              <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-10 w-12 cursor-pointer p-1" aria-label="Escolher cor" />
              <input name="corDestaque" value={cor} onChange={(e) => setCor(e.target.value)} className="w-28 font-mono" />
              <button type="button" className="text-xs text-link hover:underline" onClick={() => setCor(COR_PADRAO)}>
                Padrão
              </button>
            </span>
          </Campo>
          <div className="flex items-end sm:col-span-3">
            <span className="rounded-full px-5 py-2 text-sm text-white" style={{ background: cor }}>
              Exemplo de botão
            </span>
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-4">
          <h2 className="titulo-secao mb-0 sm:col-span-4">E-mail da loja (envio de OS e vendas)</h2>
          <p className="-mt-2 text-sm text-zinc-500 sm:col-span-4">
            Dados do servidor de envio (SMTP) do seu e-mail. No Gmail, use smtp.gmail.com, porta 465 e uma senha de app. Em branco, o sistema usa o e-mail do servidor.
          </p>
          <Campo label="Servidor SMTP" className="sm:col-span-2">
            <input name="smtpHost" defaultValue={v("smtpHost")} placeholder="smtp.gmail.com" />
          </Campo>
          <Campo label="Porta" erro={erro("smtpPorta")}>
            <Entrada mascara="digitos" name="smtpPorta" defaultValue={v("smtpPorta")} maxLength={4} placeholder="465" />
          </Campo>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="smtpSeguro" defaultChecked={estado.valores ? estado.valores.smtpSeguro === "on" : inicial.smtpSeguro} key={String(estado.valores?.smtpSeguro)} /> Conexão segura (SSL)
          </label>
          <Campo label="Usuário" className="sm:col-span-2">
            <input name="smtpUsuario" defaultValue={v("smtpUsuario")} autoComplete="off" />
          </Campo>
          <Campo label={`Senha ${inicial.temSenhaSmtp ? "· configurada" : ""}`} className="sm:col-span-2" dica="Em branco mantém a atual">
            <input name="smtpSenha" type="password" autoComplete="new-password" placeholder={inicial.temSenhaSmtp ? "••••••••" : ""} />
          </Campo>
          <Campo label="E-mail remetente" erro={erro("emailRemetente")} className="sm:col-span-2">
            <Entrada mascara="email" name="emailRemetente" defaultValue={v("emailRemetente")} placeholder="contato@sualoja.com.br" />
          </Campo>
        </section>

        <div className="flex items-center gap-3">
          <button className="btn-primario" disabled={pendente}>
            Salvar dados da loja
          </button>
          {estado.mensagem && <span className="text-sm text-green-700">{estado.mensagem}</span>}
          {estado.erros && <span className="text-sm text-red-600">Corrija os campos destacados.</span>}
        </div>
      </form>
    </div>
  );
}

function LogoDaLoja({ logo }: { logo: string | null }) {
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    const dados = new FormData();
    dados.set("logo", arquivo);
    setErro(undefined);
    iniciar(async () => {
      const r = await enviarLogo(dados);
      if (r.erro) setErro(r.erro);
    });
  }

  return (
    <section className="flex flex-wrap items-center gap-5 rounded-lg border border-zinc-200 bg-cartao p-5">
      <div className="grid size-20 place-items-center overflow-hidden rounded-xl bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? <img src={logo} alt="Logo da loja" className="size-full object-contain" /> : <span className="text-xs text-zinc-400">Sem logo</span>}
      </div>
      <div className="space-y-2">
        <h2 className="titulo-secao mb-0">Logo</h2>
        <p className="text-sm text-zinc-500">PNG, JPG ou WEBP de até 500 KB. Aparece no menu e na impressão da OS e da venda.</p>
        <div className="flex items-center gap-3">
          <label className="btn-secundario cursor-pointer">
            {pendente ? "Enviando..." : logo ? "Trocar logo" : "Enviar logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={pendente} onChange={(e) => enviar(e.target.files?.[0])} />
          </label>
          {logo && (
            <button type="button" className="text-sm text-zinc-500 hover:text-red-600" disabled={pendente} onClick={() => iniciar(() => removerLogo())}>
              Remover
            </button>
          )}
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>
    </section>
  );
}
