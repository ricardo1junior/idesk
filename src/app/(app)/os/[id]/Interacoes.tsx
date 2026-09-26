"use client";

import { useActionState, useRef, useState } from "react";
import { PadraoSenha } from "@/components/PadraoSenha";
import type { EstadoFormulario } from "@/lib/clientes";
import { adicionarItem, revelarSenha } from "../actions";

export function RevelarSenha({ osId, tipo, rotulo }: { osId: string; tipo: string; rotulo: string }) {
  const [senha, setSenha] = useState<string | null>();
  if (senha === undefined) {
    return (
      <span>
        {rotulo}{" "}
        <button type="button" className="text-xs underline" onClick={async () => setSenha(await revelarSenha(osId))}>
          mostrar
        </button>
      </span>
    );
  }
  if (!senha) return <span>{rotulo}</span>;
  return tipo === "PADRAO" ? <PadraoSenha valor={senha} somenteLeitura /> : <span className="font-mono">{senha}</span>;
}

export function NovoItem({ osId }: { osId: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [estado, acao, salvando] = useActionState<EstadoFormulario, FormData>(async (anterior, dados) => {
    const r = await adicionarItem(osId, anterior, dados);
    if (!r.erros) form.current?.reset();
    return r;
  }, {});
  const erro = (c: string) => estado.erros?.[c];

  return (
    <form ref={form} action={acao} className="grid items-end gap-3 sm:grid-cols-[8rem_1fr_5rem_8rem_auto]">
      <label className="campo">
        <span>Tipo</span>
        <select name="tipo" defaultValue="SERVICO">
          <option value="SERVICO">Serviço</option>
          <option value="PECA">Peça</option>
        </select>
      </label>
      <label className={`campo ${erro("descricao") ? "campo-erro" : ""}`}>
        <span>Descrição</span>
        <input name="descricao" placeholder="ex.: Troca de tela" />
      </label>
      <label className="campo">
        <span>Qtd.</span>
        <input name="quantidade" type="number" min={1} defaultValue={1} />
      </label>
      <label className={`campo ${erro("valorUnit") ? "campo-erro" : ""}`}>
        <span>Valor unit. (R$)</span>
        <input name="valorUnit" inputMode="decimal" placeholder="0,00" />
      </label>
      <button type="submit" disabled={salvando} className="btn-primario">
        Adicionar
      </button>
      {estado.erros && <p className="text-sm text-red-600 sm:col-span-5">{Object.values(estado.erros)[0]}</p>}
    </form>
  );
}
