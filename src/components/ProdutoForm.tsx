"use client";

import { useActionState, useState } from "react";
import { salvarProduto } from "@/app/(app)/estoque/actions";
import type { EstadoFormulario } from "@/lib/clientes";
import { TIPOS_PRODUTO } from "@/lib/estoque";
import { Campo, Secao } from "./Campos";
import { ListaModelosApple } from "./ListaModelosApple";

export function ProdutoForm({ id, inicial = {} }: { id?: string; inicial?: Record<string, string> }) {
  const [estado, acao, salvando] = useActionState<EstadoFormulario, FormData>(salvarProduto.bind(null, id ?? null), {});
  const v = { ...inicial, ...estado.valores };
  const [tipo, setTipo] = useState(v.tipo ?? "ACESSORIO");
  const erro = (c: string) => estado.erros?.[c];

  return (
    <form action={acao} className="space-y-6">
      <Secao titulo="Produto">
        <Campo label="Tipo">
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={!!id}>
            {Object.entries(TIPOS_PRODUTO).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
          {id && <input type="hidden" name="tipo" value={tipo} />}
        </Campo>
        <Campo label="Descrição" erro={erro("descricao")} className="sm:col-span-3">
          <input name="descricao" defaultValue={v.descricao} placeholder={tipo === "APARELHO" ? "ex.: iPhone 15 128GB" : "ex.: Capa MagSafe iPhone 15"} required />
        </Campo>
        <Campo label="Modelo" dica={tipo === "APARELHO" ? "Usado para achar o produto na troca" : undefined}>
          <input name="modelo" defaultValue={v.modelo} placeholder="ex.: iPhone 15" list="modelos-apple" autoComplete="off" />
          <ListaModelosApple />
        </Campo>
        <Campo label="Marca">
          <input name="marca" defaultValue={v.marca ?? "Apple"} />
        </Campo>
        <Campo label="Código de barras (EAN)" erro={erro("codigoBarras")}>
          <input name="codigoBarras" data-mascara="inteiro" maxLength={14} defaultValue={v.codigoBarras} inputMode="numeric" />
        </Campo>
        <Campo label="SKU / código interno">
          <input name="sku" defaultValue={v.sku} />
        </Campo>
        <Campo label="NCM" dica="Necessário para nota fiscal">
          <input name="ncm" data-mascara="ncm" defaultValue={v.ncm} inputMode="numeric" />
        </Campo>
        {tipo === "PECA" && (
          <Campo label="Compatível com" dica="Modelos separados por vírgula" className="sm:col-span-3">
            <input name="compativelCom" defaultValue={v.compativelCom} placeholder="iPhone 13, iPhone 13 Pro" />
          </Campo>
        )}
      </Secao>

      <Secao titulo="Preço e estoque">
        <Campo label="Preço de custo (R$)" erro={erro("precoCusto")}>
          <input name="precoCusto" data-mascara="dinheiro" defaultValue={v.precoCusto} inputMode="decimal" placeholder="0,00" />
        </Campo>
        <Campo label="Preço de venda (R$)" erro={erro("precoVenda")}>
          <input name="precoVenda" data-mascara="dinheiro" defaultValue={v.precoVenda} inputMode="decimal" placeholder="0,00" />
        </Campo>
        <Campo label="Estoque mínimo">
          <input name="estoqueMinimo" type="number" min={0} defaultValue={v.estoqueMinimo ?? "0"} />
        </Campo>
      </Secao>

      <div className="flex items-center gap-3">
        <button className="btn-primario" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar produto"}
        </button>
        {estado.erros && <span className="text-sm text-red-600">Corrija os campos destacados.</span>}
      </div>
    </form>
  );
}
