"use client";

import { useActionState } from "react";
import { Campo } from "@/components/Campos";
import type { EstadoFormulario } from "@/lib/clientes";
import { lancarCreditoManual, salvarCobrancaLoja, salvarConfigSistema } from "./actions";

const reais = (v: number) => v.toFixed(2).replace(".", ",");

function Rodape({ pendente, estado, texto }: { pendente: boolean; estado: EstadoFormulario; texto: string }) {
  return (
    <div className="flex items-center gap-3 sm:col-span-full">
      <button className="btn-primario" disabled={pendente}>
        {pendente ? "Salvando..." : texto}
      </button>
      {estado.mensagem && <span className="text-sm text-green-700">{estado.mensagem}</span>}
    </div>
  );
}

export function FormCobrancaLoja({ empresaId, diaria, isenta, diariaPadrao }: { empresaId: string; diaria: number | null; isenta: boolean; diariaPadrao: number }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(salvarCobrancaLoja.bind(null, empresaId), {});
  return (
    <form action={acao} className="grid gap-4 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-2">
      <h2 className="titulo-secao sm:col-span-full">Cobrança</h2>
      <Campo label="Diária desta loja (R$)" erro={estado.erros?.diaria} dica={`Vazio = padrão do sistema (R$ ${reais(diariaPadrao)})`}>
        <input name="diaria" inputMode="decimal" defaultValue={estado.valores?.diaria ?? (diaria === null ? "" : reais(diaria))} />
      </Campo>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="isenta" defaultChecked={estado.valores ? estado.valores.isenta === "on" : isenta} />
        Isenta (não paga diária)
      </label>
      <Rodape pendente={pendente} estado={estado} texto="Salvar cobrança" />
    </form>
  );
}

export function FormCreditoManual({ empresaId }: { empresaId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(lancarCreditoManual.bind(null, empresaId), {});
  return (
    <form action={acao} key={estado.mensagem} className="grid gap-4 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-3">
      <h2 className="titulo-secao sm:col-span-full">Lançar crédito</h2>
      <Campo label="Tipo">
        <select name="tipo" defaultValue={estado.valores?.tipo ?? "BONUS"}>
          <option value="BONUS">Bônus (cortesia)</option>
          <option value="AJUSTE">Ajuste (pode ser negativo)</option>
        </select>
      </Campo>
      <Campo label="Valor (R$)" erro={estado.erros?.valor}>
        <input name="valor" data-mascara="dinheiro" inputMode="decimal" defaultValue={estado.valores?.valor} required />
      </Campo>
      <Campo label="Descrição">
        <input name="descricao" defaultValue={estado.valores?.descricao} placeholder="Ex.: pagamento em dinheiro" />
      </Campo>
      <Rodape pendente={pendente} estado={estado} texto="Lançar" />
    </form>
  );
}

export function FormConfigSistema({ config }: { config: { diariaPadrao: number; diasTolerancia: number; creditoBoasVindas: number; recargaMinima: number } }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(salvarConfigSistema, {});
  const v = (c: keyof typeof config, f: (n: number) => string = reais) => estado.valores?.[c] ?? f(config[c]);
  return (
    <form action={acao} className="grid gap-4 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-4">
      <h2 className="titulo-secao sm:col-span-full">Cobrança das lojas</h2>
      <Campo label="Diária padrão (R$)" erro={estado.erros?.diariaPadrao} dica="Lojas sem diária própria">
        <input name="diariaPadrao" inputMode="decimal" defaultValue={v("diariaPadrao")} required />
      </Campo>
      <Campo label="Dias de tolerância" erro={estado.erros?.diasTolerancia} dica="Uso com saldo negativo antes do modo consulta">
        <input name="diasTolerancia" type="number" min={0} max={60} defaultValue={v("diasTolerancia", String)} required />
      </Campo>
      <Campo label="Crédito de boas-vindas (R$)" erro={estado.erros?.creditoBoasVindas} dica="Para cada loja nova">
        <input name="creditoBoasVindas" inputMode="decimal" defaultValue={v("creditoBoasVindas")} required />
      </Campo>
      <Campo label="Recarga mínima (R$)" erro={estado.erros?.recargaMinima}>
        <input name="recargaMinima" data-mascara="dinheiro" inputMode="decimal" defaultValue={v("recargaMinima")} required />
      </Campo>
      <Rodape pendente={pendente} estado={estado} texto="Salvar valores" />
    </form>
  );
}
