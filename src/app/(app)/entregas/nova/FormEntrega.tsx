"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Campo } from "@/components/Campos";
import { BuscaCliente } from "@/components/OSForm";
import type { EstadoFormulario } from "@/lib/clientes";
import { formatarDuracao, TIPOS_ENTREGA } from "@/lib/entregas";
import { criarEntrega, dadosClienteEntrega, estimarRota, type Estimativa } from "../actions";

type Dados = NonNullable<Awaited<ReturnType<typeof dadosClienteEntrega>>>;

export function FormEntrega({
  cliente: inicial,
  vendaId,
  osId,
  usuarios,
}: {
  cliente?: { id: string; nome: string };
  vendaId?: string;
  osId?: string;
  usuarios: { id: string; nome: string }[];
}) {
  const [estado, acao, salvando] = useActionState<EstadoFormulario, FormData>(criarEntrega, {});
  const erro = (c: string) => estado.erros?.[c];
  // Com erro de validação, os campos voltam com o que foi digitado.
  const v = estado.valores ?? {};
  const [cliente, setCliente] = useState(inicial);
  const [dados, setDados] = useState<Dados | null>(null);
  const [endereco, setEndereco] = useState("");
  const [estimativa, setEstimativa] = useState<Estimativa | null>(null);
  const [calculando, iniciar] = useTransition();

  useEffect(() => {
    if (!cliente) return;
    dadosClienteEntrega(cliente.id).then((d) => {
      setDados(d);
      if (d?.enderecos[0]) setEndereco(d.enderecos[0].linha);
    });
  }, [cliente]);

  const calcular = () => {
    setEstimativa(null);
    iniciar(async () => setEstimativa(await estimarRota(endereco)));
  };

  return (
    <form action={acao} className="space-y-6">
      <section className="space-y-4 rounded-lg border border-zinc-200 bg-cartao p-5">
        <h2 className="titulo-secao">Cliente e endereço</h2>
        {cliente ? (
          <div className="flex items-center gap-3">
            <input type="hidden" name="clienteId" value={cliente.id} />
            <b>{cliente.nome}</b>
            <button
              type="button"
              className="text-sm text-link hover:underline"
              onClick={() => {
                setCliente(undefined);
                setDados(null);
                setEndereco("");
                setEstimativa(null);
              }}
            >
              Trocar
            </button>
          </div>
        ) : (
          <BuscaCliente onSelecionar={(c) => setCliente({ id: c.id, nome: c.nome })} erro={erro("clienteId")} />
        )}

        {dados && dados.enderecos.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-zinc-700">Endereços cadastrados</div>
            {dados.enderecos.map((e) => (
              <label key={e.rotulo + e.linha} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="_endereco"
                  checked={endereco === e.linha}
                  onChange={() => {
                    setEndereco(e.linha);
                    setEstimativa(null);
                  }}
                  className="mt-1"
                />
                <span>
                  <b>{e.rotulo}:</b> {e.linha}
                </span>
              </label>
            ))}
          </div>
        )}
        <Campo label="Endereço de entrega" erro={erro("endereco")} dica="Pode ajustar ou digitar outro endereço">
          <input
            name="endereco"
            value={endereco}
            onChange={(e) => {
              setEndereco(e.target.value);
              setEstimativa(null);
            }}
            placeholder="Rua, número, bairro, cidade - UF"
          />
        </Campo>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secundario" disabled={endereco.trim().length < 8 || calculando} onClick={calcular}>
            {calculando ? "Calculando…" : "Calcular ida e volta"}
          </button>
          {estimativa?.minutosTotal != null && (
            <div className="rounded-lg bg-zinc-50 px-4 py-2 text-sm">
              <b className="text-lg">{formatarDuracao(estimativa.minutosTotal)}</b> fora da loja
              <span className="text-zinc-500">
                {" "}
                · {estimativa.distanciaKm?.toLocaleString("pt-BR")} km e ~{formatarDuracao(estimativa.minutosIda!)} para ir, o mesmo para voltar, mais o tempo no local
              </span>
            </div>
          )}
          {estimativa?.erro && <span className="text-sm text-amber-700">{estimativa.erro}</span>}
          {estimativa && (
            <a href={estimativa.mapa} target="_blank" rel="noreferrer" className="text-sm text-link hover:underline">
              Ver rota no Google Maps
            </a>
          )}
        </div>
        <input type="hidden" name="distanciaKm" value={estimativa?.distanciaKm ?? ""} />
        <input type="hidden" name="minutosIda" value={estimativa?.minutosIda ?? ""} />
        <input type="hidden" name="minutosTotal" value={estimativa?.minutosTotal ?? ""} />
      </section>

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-4">
        <h2 className="titulo-secao sm:col-span-4">Detalhes</h2>
        <Campo label="Tipo" className="sm:col-span-2">
          <select name="tipo" defaultValue={v.tipo ?? "ENTREGA"} key={v.tipo}>
            {Object.entries(TIPOS_ENTREGA).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Dia" erro={erro("dia")}>
          <input name="dia" type="date" defaultValue={v.dia} />
        </Campo>
        <Campo label="Hora de saída" erro={erro("hora")}>
          <input name="hora" type="time" defaultValue={v.hora} />
        </Campo>
        {dados && dados.vendas.length > 0 && (
          <Campo label="Venda" erro={erro("vendaId")} className="sm:col-span-2">
            <select name="vendaId" defaultValue={v.vendaId ?? vendaId ?? ""} key={v.vendaId}>
              <option value="">Nenhuma</option>
              {dados.vendas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.rotulo}
                </option>
              ))}
            </select>
          </Campo>
        )}
        {dados && dados.ordens.length > 0 && (
          <Campo label="Ordem de serviço" erro={erro("osId")} className="sm:col-span-2">
            <select name="osId" defaultValue={v.osId ?? osId ?? ""} key={v.osId}>
              <option value="">Nenhuma</option>
              {dados.ordens.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <Campo label="Taxa de entrega (R$)" erro={erro("taxa")}>
          <input name="taxa" inputMode="decimal" placeholder="0,00" defaultValue={v.taxa} />
        </Campo>
        <Campo label="Quem vai" erro={erro("responsavelId")} className="sm:col-span-2">
          <select name="responsavelId" defaultValue={v.responsavelId ?? ""} key={v.responsavelId}>
            <option value="">A definir</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Observações" className="sm:col-span-4">
          <input name="observacoes" defaultValue={v.observacoes} placeholder="ex.: interfone 12, falar com a portaria" />
        </Campo>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primario" disabled={salvando || !cliente}>
          {salvando ? "Salvando…" : "Salvar entrega"}
        </button>
        {estado.erros && <span className="text-sm text-red-600">Corrija os campos destacados.</span>}
      </div>
    </form>
  );
}
