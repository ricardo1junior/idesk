"use client";

import { useActionState, useState } from "react";
import { Campo } from "@/components/Campos";
import { ListaCapacidades, ListaModelosApple } from "@/components/ListaModelosApple";
import type { EstadoFormulario } from "@/lib/clientes";
import { CONDICOES } from "@/lib/estoque";
import { entradaAparelho, movimentarEstoque } from "../../actions";

export function MovimentoForm({ produtoId }: { produtoId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(movimentarEstoque.bind(null, produtoId), {});
  const v = estado.valores ?? {};
  return (
    <form action={acao} key={estado.mensagem} className="grid items-end gap-3 sm:grid-cols-5">
      <Campo label="Operação">
        <select name="tipo" defaultValue={v.tipo ?? "ENTRADA_NOTA"}>
          <option value="ENTRADA_NOTA">Entrada</option>
          <option value="AJUSTE">Ajuste (+/-)</option>
        </select>
      </Campo>
      <Campo label="Quantidade" erro={estado.erros?.quantidade}>
        <input name="quantidade" type="number" step={1} defaultValue={v.quantidade} required />
      </Campo>
      <Campo label="Custo unit. (R$)" erro={estado.erros?.custoUnit}>
        <input name="custoUnit" defaultValue={v.custoUnit} inputMode="decimal" placeholder="opcional" />
      </Campo>
      <Campo label="Referência">
        <input name="referencia" defaultValue={v.referencia} placeholder="ex.: NF 1234" />
      </Campo>
      <button className="btn-primario" disabled={pendente}>
        {pendente ? "Lançando..." : "Lançar"}
      </button>
      {estado.mensagem && <p className="text-sm text-green-700 sm:col-span-5">{estado.mensagem}</p>}
    </form>
  );
}

export function EntradaAparelhoForm({ produtoId, modelo }: { produtoId: string; modelo: string }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(entradaAparelho.bind(null, produtoId), {});
  const v = estado.valores ?? {};
  const erro = (c: string) => estado.erros?.[c];
  const [modeloAtual, setModeloAtual] = useState(v.modelo ?? modelo);
  return (
    <form action={acao} key={estado.mensagem} className="grid gap-3 sm:grid-cols-4">
      <ListaModelosApple />
      <ListaCapacidades modelo={modeloAtual} />
      <Campo label="Modelo" erro={erro("modelo")}>
        <input name="modelo" defaultValue={v.modelo ?? modelo} onChange={(e) => setModeloAtual(e.target.value)} list="modelos-apple" autoComplete="off" required />
      </Campo>
      <Campo label="Capacidade">
        <input name="capacidade" defaultValue={v.capacidade} placeholder="128 GB" list="capacidades-apple" autoComplete="off" />
      </Campo>
      <Campo label="Cor">
        <input name="cor" defaultValue={v.cor} />
      </Campo>
      <Campo label="Condição">
        <select name="condicao" defaultValue={v.condicao ?? "NOVO"}>
          {Object.entries(CONDICOES).map(([c, l]) => (
            <option key={c} value={c}>
              {l}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="IMEI" erro={erro("imei")}>
        <input name="imei" defaultValue={v.imei} inputMode="numeric" maxLength={15} />
      </Campo>
      <Campo label="IMEI 2" erro={erro("imei2")}>
        <input name="imei2" defaultValue={v.imei2} inputMode="numeric" maxLength={15} />
      </Campo>
      <Campo label="Nº de série">
        <input name="serial" defaultValue={v.serial} className="uppercase" />
      </Campo>
      <Campo label="Bateria (%)" erro={erro("saudeBateria")}>
        <input name="saudeBateria" defaultValue={v.saudeBateria} inputMode="numeric" />
      </Campo>
      <Campo label="Custo (R$)" erro={erro("custo")}>
        <input name="custo" defaultValue={v.custo} inputMode="decimal" placeholder="0,00" />
      </Campo>
      <Campo label="Observações" className="sm:col-span-2">
        <input name="observacoes" defaultValue={v.observacoes} />
      </Campo>
      <div className="flex items-end">
        <button className="btn-primario" disabled={pendente}>
          {pendente ? "Adicionando..." : "Adicionar ao estoque"}
        </button>
      </div>
      {estado.mensagem && <p className="text-sm text-green-700 sm:col-span-4">{estado.mensagem}</p>}
      {erro("geral") && <p className="text-sm text-red-600 sm:col-span-4">{erro("geral")}</p>}
    </form>
  );
}
