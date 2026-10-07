"use client";

import { useActionState } from "react";
import { Campo } from "@/components/Campos";
import { DIAS_SEMANA } from "@/lib/agenda";
import type { EstadoFormulario } from "@/lib/clientes";
import { salvarConfigLoja } from "./actions";

type Inicial = {
  endereco: string;
  abreAs: string;
  fechaAs: string;
  diasSemana: number[];
  duracaoAtendimento: string;
  atendimentosSimultaneos: string;
  minutosNoLocalEntrega: string;
  motoboyTaxaFixa: string;
  motoboyValorKm: string;
  motoboyMinutosRetirada: string;
};

export function FormConfigLoja({ inicial }: { inicial: Inicial }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(salvarConfigLoja, {});
  const v = (c: keyof Inicial) => estado.valores?.[c] ?? String(inicial[c]);
  const erro = (c: string) => estado.erros?.[c];
  return (
    <form action={acao} className="space-y-6">
      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-4">
        <h2 className="titulo-secao sm:col-span-4">Agenda de atendimentos</h2>
        <Campo label="Abre às" erro={erro("abreAs")}>
          <input name="abreAs" type="time" defaultValue={v("abreAs")} />
        </Campo>
        <Campo label="Fecha às" erro={erro("fechaAs")}>
          <input name="fechaAs" type="time" defaultValue={v("fechaAs")} />
        </Campo>
        <Campo label="Duração de cada horário (min)" erro={erro("duracaoAtendimento")}>
          <input name="duracaoAtendimento" type="number" min={5} step={5} defaultValue={v("duracaoAtendimento")} />
        </Campo>
        <Campo label="Clientes atendidos ao mesmo tempo" erro={erro("atendimentosSimultaneos")} dica="Quantos atendentes no balcão">
          <input name="atendimentosSimultaneos" type="number" min={1} defaultValue={v("atendimentosSimultaneos")} />
        </Campo>
        <div className="sm:col-span-4">
          <div className="mb-2 text-sm font-medium text-zinc-700">Dias de funcionamento</div>
          <div className="flex flex-wrap gap-2">
            {DIAS_SEMANA.map((d, i) => (
              <label key={d} className="chip">
                <input type="checkbox" name="diasSemana" value={i} defaultChecked={inicial.diasSemana.includes(i)} className="sr-only" />
                <span>{d}</span>
              </label>
            ))}
          </div>
          {erro("diasSemana") && <small className="text-red-600">{erro("diasSemana")}</small>}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-4">
        <h2 className="titulo-secao sm:col-span-4">Entregas</h2>
        <Campo label="Endereço da loja (ponto de saída)" className="sm:col-span-3" dica="Rua, número, bairro, cidade e UF">
          <input name="endereco" defaultValue={v("endereco")} placeholder="ex.: Av. Paulista, 1000, Bela Vista, São Paulo - SP" />
        </Campo>
        <Campo label="Tempo no local (min)" erro={erro("minutosNoLocalEntrega")} dica="Somado à ida e volta">
          <input name="minutosNoLocalEntrega" type="number" min={0} defaultValue={v("minutosNoLocalEntrega")} />
        </Campo>
        <p className="text-sm text-zinc-500 sm:col-span-4">
          Estimativa do motoboy: o sistema calcula o custo como taxa fixa + valor por km (só a ida) e o tempo como a espera para ele chegar à loja + a ida até o cliente.
        </p>
        <Campo label="Motoboy: taxa fixa (R$)" erro={erro("motoboyTaxaFixa")}>
          <input name="motoboyTaxaFixa" data-mascara="dinheiro" inputMode="decimal" defaultValue={v("motoboyTaxaFixa")} />
        </Campo>
        <Campo label="Motoboy: valor por km (R$)" erro={erro("motoboyValorKm")}>
          <input name="motoboyValorKm" data-mascara="dinheiro" inputMode="decimal" defaultValue={v("motoboyValorKm")} />
        </Campo>
        <Campo label="Motoboy: chega à loja em (min)" erro={erro("motoboyMinutosRetirada")} className="sm:col-span-2">
          <input name="motoboyMinutosRetirada" type="number" min={0} defaultValue={v("motoboyMinutosRetirada")} />
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
