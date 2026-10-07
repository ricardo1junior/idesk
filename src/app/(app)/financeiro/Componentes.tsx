"use client";

import Form from "next/form";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Campo } from "@/components/Campos";
import type { EstadoFormulario } from "@/lib/clientes";
import { PERIODOS, type Filtros } from "@/lib/financeiro-filtros-cliente";
import { ymdLocal } from "@/lib/tempo";
import { FORMAS_PAGAMENTO } from "@/lib/vendas";
import { criarLancamento } from "./actions";

type Categoria = { id: string; nome: string; tipo: string };

export function FiltrosFluxo({ filtros, categorias }: { filtros: Filtros; categorias: Categoria[] }) {
  const [periodo, setPeriodo] = useState(filtros.periodo);
  const [base, setBase] = useState(filtros.base);
  return (
    <Form action="/financeiro" className="grid gap-3 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-4">
      <Campo label="Visão">
        <select name="base" value={base} onChange={(e) => setBase(e.target.value as Filtros["base"])}>
          <option value="pagamento">Realizado (o que entrou e saiu)</option>
          <option value="vencimento">Previsto (por vencimento)</option>
        </select>
      </Campo>
      <Campo label="Período">
        <select name="periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value as Filtros["periodo"])}>
          {Object.entries(PERIODOS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Campo>
      {periodo === "personalizado" && (
        <>
          <Campo label="De">
            <input type="date" name="de" defaultValue={filtros.de} />
          </Campo>
          <Campo label="Até">
            <input type="date" name="ate" defaultValue={filtros.ate} />
          </Campo>
        </>
      )}
      <Campo label="Tipo">
        <select name="tipo" defaultValue={filtros.tipo ?? ""}>
          <option value="">Entradas e saídas</option>
          <option value="ENTRADA">Só entradas</option>
          <option value="SAIDA">Só saídas</option>
        </select>
      </Campo>
      {base === "vencimento" && (
        <Campo label="Situação">
          <select name="status" defaultValue={filtros.status ?? ""}>
            <option value="">Pagos e em aberto</option>
            <option value="ABERTOS">Só em aberto</option>
            <option value="PAGO">Só pagos</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
        </Campo>
      )}
      <Campo label="Categoria">
        <select name="categoriaId" defaultValue={filtros.categoriaId ?? ""}>
          <option value="">Todas</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.tipo === "ENTRADA" ? "↑" : "↓"} {c.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Forma de pagamento">
        <select name="forma" defaultValue={filtros.forma ?? ""}>
          <option value="">Todas</option>
          {Object.entries(FORMAS_PAGAMENTO)
            .filter(([f]) => f !== "TROCA")
            .map(([f, l]) => (
              <option key={f} value={f}>
                {l}
              </option>
            ))}
        </select>
      </Campo>
      <Campo label="Agrupar por">
        <select name="agrupar" defaultValue={filtros.agrupar}>
          <option value="nenhum">Não agrupar</option>
          <option value="dia">Dia</option>
          <option value="categoria">Categoria</option>
          <option value="forma">Forma de pagamento</option>
        </select>
      </Campo>
      <Campo label="Buscar" className="sm:col-span-2">
        <input name="q" defaultValue={filtros.q} placeholder="Descrição, cliente ou fornecedor" />
      </Campo>
      <div className="flex items-end gap-2 sm:col-span-2">
        <button className="btn-primario">Pesquisar</button>
        <Link href="/financeiro" className="btn-secundario">
          Limpar
        </Link>
      </div>
    </Form>
  );
}

export function NovoLancamento({ categorias }: { categorias: Categoria[] }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(criarLancamento, {});
  const [tipo, setTipo] = useState("SAIDA");
  const erro = (c: string) => estado.erros?.[c];
  // Em caso de erro a action devolve o que foi digitado, para não perder o formulário.
  const v = estado.valores ?? {};
  return (
    <form action={acao} key={estado.mensagem} className="grid gap-3 sm:grid-cols-4">
      <Campo label="Tipo">
        <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="SAIDA">Saída (despesa, conta a pagar)</option>
          <option value="ENTRADA">Entrada (receita, conta a receber)</option>
        </select>
      </Campo>
      <Campo label="Descrição" erro={erro("descricao")} className="sm:col-span-2">
        <input name="descricao" defaultValue={v.descricao} placeholder="ex.: Aluguel de outubro" />
      </Campo>
      <Campo label="Categoria" erro={erro("categoriaId")}>
        <select name="categoriaId" defaultValue={v.categoriaId ?? ""}>
          <option value="">Sem categoria</option>
          {categorias
            .filter((c) => c.tipo === tipo)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
        </select>
      </Campo>
      <Campo label="Valor total (R$)" erro={erro("valor")}>
        <input name="valor" data-mascara="dinheiro" defaultValue={v.valor} inputMode="decimal" placeholder="0,00" />
      </Campo>
      <Campo label="Vencimento (1ª parcela)" erro={erro("vencimento")}>
        <input name="vencimento" type="date" defaultValue={v.vencimento ?? ymdLocal(new Date())} />
      </Campo>
      <Campo label="Parcelas (mensais)" erro={erro("parcelas")}>
        <input name="parcelas" type="number" min={1} max={60} defaultValue={v.parcelas ?? 1} />
      </Campo>
      <Campo label="Forma">
        <select name="forma" defaultValue={v.forma ?? ""}>
          <option value="">-</option>
          {Object.entries(FORMAS_PAGAMENTO)
            .filter(([f]) => f !== "TROCA")
            .map(([f, l]) => (
              <option key={f} value={f}>
                {l}
              </option>
            ))}
        </select>
      </Campo>
      <Campo label="Observações" className="sm:col-span-3">
        <input name="observacoes" defaultValue={v.observacoes} />
      </Campo>
      <label className="flex items-end gap-2 pb-2 text-sm">
        <input type="checkbox" name="pago" value="sim" defaultChecked={v.pago === "sim"} /> Já foi pago (à vista)
      </label>
      <div className="flex items-center gap-3 sm:col-span-4">
        <button className="btn-primario" disabled={pendente}>
          {pendente ? "Lançando..." : "Lançar"}
        </button>
        {estado.mensagem && <span className="text-sm text-green-700">{estado.mensagem}</span>}
        {estado.erros && <span className="text-sm text-red-600">Corrija os campos destacados.</span>}
      </div>
    </form>
  );
}
