"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Campo } from "@/components/Campos";
import { Entrada } from "@/components/Entrada";
import { BuscaCliente } from "@/components/OSForm";
import type { EstadoFormulario } from "@/lib/clientes";
import { paraNumero } from "@/lib/estoque";
import { formatarDuracao, MODALIDADES_ENTREGA, PRESTADORES_SUGERIDOS, TIPOS_ENTREGA } from "@/lib/entregas";
import { formatarReais } from "@/lib/vendas";
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
  // Quem leva o aparelho: equipe da loja, motoboy ou serviço terceirizado.
  const [modalidade, setModalidade] = useState<keyof typeof MODALIDADES_ENTREGA>((v.modalidade as keyof typeof MODALIDADES_ENTREGA) ?? "LOJA");
  const [minutosPrestador, setMinutosPrestador] = useState(v.minutosPrestador ?? "");
  const [custo, setCusto] = useState(v.custo ?? "");
  const [taxa, setTaxa] = useState(v.taxa ?? "");
  const terceiro = modalidade !== "LOJA";
  const valorCusto = paraNumero(custo);
  const valorTaxa = paraNumero(taxa);

  // Preenche tempo e custo do motoboy com a estimativa, sem apagar o que já foi digitado.
  function aplicarEstimativa(e: Estimativa | null) {
    if (!e?.motoboy) return;
    setMinutosPrestador((atual) => atual || String(e.motoboy!.minutos));
    setCusto((atual) => atual || String(e.motoboy!.custo).replace(".", ","));
  }

  useEffect(() => {
    if (!cliente) return;
    dadosClienteEntrega(cliente.id).then((d) => {
      setDados(d);
      if (d?.enderecos[0]) setEndereco(d.enderecos[0].linha);
    });
  }, [cliente]);

  const calcular = () => {
    setEstimativa(null);
    iniciar(async () => {
      const e = await estimarRota(endereco);
      setEstimativa(e);
      if (terceiro) aplicarEstimativa(e);
    });
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
        {estimativa?.minutosTotal != null && estimativa.motoboy && (
          <div className="grid gap-2 sm:grid-cols-2">
            <OpcaoEntrega
              ativo={modalidade === "LOJA"}
              titulo="Equipe da loja"
              valor={formatarDuracao(estimativa.minutosTotal)}
              detalhe="fora da loja, indo e voltando"
              onClick={() => setModalidade("LOJA")}
            />
            <OpcaoEntrega
              ativo={terceiro}
              titulo="Motoboy (estimativa)"
              valor={`~${formatarDuracao(estimativa.motoboy.minutos)} · ${formatarReais(estimativa.motoboy.custo)}`}
              detalhe="até o cliente receber, com a retirada na loja"
              onClick={() => {
                if (!terceiro) setModalidade("MOTOBOY");
                aplicarEstimativa(estimativa);
              }}
            />
          </div>
        )}
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
        <Campo label="Observações" className="sm:col-span-4">
          <input name="observacoes" defaultValue={v.observacoes} placeholder="ex.: interfone 12, falar com a portaria" />
        </Campo>
      </section>

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-cartao p-5 sm:grid-cols-4">
        <h2 className="titulo-secao sm:col-span-4">Quem leva</h2>
        <input type="hidden" name="modalidade" value={modalidade} />
        <div className="grid gap-2 sm:col-span-4 sm:grid-cols-3" role="radiogroup" aria-label="Quem leva">
          {(Object.keys(MODALIDADES_ENTREGA) as (keyof typeof MODALIDADES_ENTREGA)[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={modalidade === m}
              onClick={() => {
                setModalidade(m);
                if (m !== "LOJA") aplicarEstimativa(estimativa);
              }}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition ${modalidade === m ? "border-azul bg-azul/5 ring-2 ring-azul/30" : "border-zinc-200 hover:border-zinc-300"}`}
            >
              <div className="font-medium">{MODALIDADES_ENTREGA[m].label}</div>
              <div className="text-xs text-zinc-500">{MODALIDADES_ENTREGA[m].dica}</div>
            </button>
          ))}
        </div>

        {terceiro ? (
          <>
            <Campo label={modalidade === "MOTOBOY" ? "Motoboy" : "Empresa"} erro={erro("prestador")} className="sm:col-span-2">
              <input name="prestador" list="prestadores" defaultValue={v.prestador} placeholder={modalidade === "MOTOBOY" ? "ex.: Carlos (motoboy parceiro)" : "ex.: Lalamove"} />
              <datalist id="prestadores">
                {PRESTADORES_SUGERIDOS.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </Campo>
            <Campo label="Tempo até o cliente (min)" erro={erro("minutosPrestador")} dica={estimativa?.motoboy ? "Estimado; ajuste se o app informar outro" : "Calcule a rota ou digite"}>
              <input name="minutosPrestador" type="number" min={0} value={minutosPrestador} onChange={(e) => setMinutosPrestador(e.target.value)} />
            </Campo>
            <Campo label="Custo para a loja (R$)" erro={erro("custo")} dica="Quanto a loja paga pela corrida">
              <Entrada mascara="dinheiro" name="custo" value={custo} onChange={(e) => setCusto(e.target.value)} />
            </Campo>
          </>
        ) : (
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
        )}
        <Campo label="Taxa cobrada do cliente (R$)" erro={erro("taxa")} className="sm:col-span-2">
          <Entrada mascara="dinheiro" name="taxa" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
        </Campo>
        {terceiro && (valorCusto > 0 || valorTaxa > 0) && Number.isFinite(valorCusto) && Number.isFinite(valorTaxa) && (
          <div className={`self-end rounded-lg px-4 py-2 text-sm sm:col-span-2 ${valorTaxa - valorCusto >= 0 ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
            {valorTaxa - valorCusto >= 0 ? "Sobra para a loja" : "A loja paga a diferença"}: <b>{formatarReais(Math.abs(valorTaxa - valorCusto))}</b>
          </div>
        )}
        {terceiro && <p className="text-xs text-zinc-500 sm:col-span-4">Ao concluir a entrega, o custo entra no Financeiro como saída (categoria Entregas e fretes).</p>}
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

function OpcaoEntrega({ ativo, titulo, valor, detalhe, onClick }: { ativo: boolean; titulo: string; valor: string; detalhe: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-left text-sm transition ${ativo ? "border-azul bg-azul/5" : "border-zinc-200 hover:border-zinc-300"}`}
    >
      <div className="text-xs text-zinc-500">{titulo}</div>
      <div className="text-base font-semibold">{valor}</div>
      <div className="text-xs text-zinc-500">{detalhe}</div>
    </button>
  );
}
