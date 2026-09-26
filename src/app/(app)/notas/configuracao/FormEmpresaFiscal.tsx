"use client";

import { useActionState } from "react";
import { Campo } from "@/components/Campos";
import type { EstadoFormulario } from "@/lib/clientes";
import { salvarEmpresaFiscal } from "../emissao";

const REGIMES = {
  SIMPLES_NACIONAL: "Simples Nacional",
  SIMPLES_EXCESSO: "Simples Nacional (excesso de sublimite)",
  NORMAL: "Lucro Presumido ou Real",
  MEI: "MEI",
};

export function FormEmpresaFiscal({ empresa }: { empresa?: Record<string, string> }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(salvarEmpresaFiscal, {});
  const v = (c: string, padrao = "") => estado.valores?.[c] ?? empresa?.[c] ?? padrao;
  const erro = (c: string) => estado.erros?.[c];
  return (
    <form action={acao} className="space-y-6">
      <section className="grid gap-3 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-4">
        <h2 className="titulo-secao sm:col-span-4">Empresa</h2>
        <Campo label="CNPJ" erro={erro("cnpj")}>
          <input name="cnpj" defaultValue={v("cnpj")} />
        </Campo>
        <Campo label="Razão social" erro={erro("razaoSocial")} className="sm:col-span-2">
          <input name="razaoSocial" defaultValue={v("razaoSocial")} />
        </Campo>
        <Campo label="Nome fantasia">
          <input name="nomeFantasia" defaultValue={v("nomeFantasia")} />
        </Campo>
        <Campo label="Inscrição estadual">
          <input name="inscricaoEstadual" defaultValue={v("inscricaoEstadual")} />
        </Campo>
        <Campo label="UF" erro={erro("uf")}>
          <input name="uf" maxLength={2} defaultValue={v("uf")} />
        </Campo>
        <Campo label="Regime tributário" className="sm:col-span-2">
          <select name="regime" defaultValue={v("regime", "SIMPLES_NACIONAL")}>
            {Object.entries(REGIMES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Ambiente" className="sm:col-span-2">
          <select name="ambiente" defaultValue={v("ambiente", "HOMOLOGACAO")}>
            <option value="HOMOLOGACAO">Homologação (testes, sem valor fiscal)</option>
            <option value="PRODUCAO">Produção (notas valem de verdade)</option>
          </select>
        </Campo>
      </section>

      <section className="grid gap-3 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-4">
        <h2 className="titulo-secao sm:col-span-4">Impostos padrão dos itens</h2>
        <Campo label="CSOSN / CST do ICMS" erro={erro("icmsSituacao")}>
          <input name="icmsSituacao" defaultValue={v("icmsSituacao", "102")} />
        </Campo>
        <Campo label="Alíquota ICMS (%) · só regime normal" erro={erro("icmsAliquota")}>
          <input name="icmsAliquota" inputMode="decimal" defaultValue={v("icmsAliquota", "0")} />
        </Campo>
        <Campo label="CST PIS/COFINS" erro={erro("pisCofinsCst")}>
          <input name="pisCofinsCst" defaultValue={v("pisCofinsCst", "07")} />
        </Campo>
        <Campo label="Origem da mercadoria">
          <select name="origemPadrao" defaultValue={v("origemPadrao", "0")}>
            <option value="0">0 · Nacional</option>
            <option value="1">1 · Estrangeira, importação direta</option>
            <option value="2">2 · Estrangeira, adquirida no mercado interno</option>
          </select>
        </Campo>
        <Campo label="CFOP dentro do estado" erro={erro("cfopDentroEstado")}>
          <input name="cfopDentroEstado" defaultValue={v("cfopDentroEstado", "5102")} />
        </Campo>
        <Campo label="CFOP para outro estado" erro={erro("cfopForaEstado")}>
          <input name="cfopForaEstado" defaultValue={v("cfopForaEstado", "6102")} />
        </Campo>
        <Campo label="Natureza da operação" erro={erro("naturezaOperacao")} className="sm:col-span-2">
          <input name="naturezaOperacao" defaultValue={v("naturezaOperacao", "Venda de mercadoria")} />
        </Campo>
        <Campo label="Informações complementares (em branco usa o texto padrão do Simples)" className="sm:col-span-4">
          <textarea name="informacoesFisco" rows={2} defaultValue={v("informacoesFisco")} />
        </Campo>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primario" disabled={pendente}>
          Salvar
        </button>
        {estado.mensagem && <span className="text-sm text-green-700">{estado.mensagem}</span>}
        {estado.erros && <span className="text-sm text-red-600">Corrija os campos destacados.</span>}
      </div>
    </form>
  );
}
