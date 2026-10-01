"use client";

import type { StatusOS } from "@prisma/client";
import { useActionState, useState, useTransition } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { PadraoSenha } from "@/components/PadraoSenha";
import type { EstadoFormulario } from "@/lib/clientes";
import { STATUS_OS } from "@/lib/os";
import { FORMAS_PAGAMENTO } from "@/lib/vendas";
import { FotosAparelho, fotosParaEnvio, type FotoEnviada } from "@/components/FotosAparelho";
import { adicionarFotos, adicionarItem, definirDesconto, mudarStatus, registrarPagamentoOS, revelarSenha } from "../actions";

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
  const [estado, acao, salvando] = useActionState<EstadoFormulario, FormData>(adicionarItem.bind(null, osId), {});
  const erro = (c: string) => estado.erros?.[c];
  // Com erro, o que foi digitado volta para o formulário; depois de adicionar, ele fica limpo.
  const v = estado.valores ?? {};

  return (
    <form action={acao} className="grid items-end gap-3 sm:grid-cols-[8rem_1fr_5rem_8rem_auto]">
      <label className="campo">
        <span>Tipo</span>
        <select name="tipo" defaultValue={v.tipo ?? "SERVICO"} key={v.tipo}>
          <option value="SERVICO">Serviço</option>
          <option value="PECA">Peça</option>
        </select>
      </label>
      <label className={`campo ${erro("descricao") ? "campo-erro" : ""}`}>
        <span>Descrição</span>
        <input name="descricao" defaultValue={v.descricao} placeholder="ex.: Troca de tela" />
      </label>
      <label className={`campo ${erro("quantidade") ? "campo-erro" : ""}`}>
        <span>Qtd.</span>
        <input name="quantidade" type="number" min={1} defaultValue={v.quantidade ?? 1} />
      </label>
      <label className={`campo ${erro("valorUnit") ? "campo-erro" : ""}`}>
        <span>Valor unit. (R$)</span>
        <input name="valorUnit" inputMode="decimal" defaultValue={v.valorUnit} placeholder="0,00" />
      </label>
      <button type="submit" disabled={salvando} className="btn-primario">
        Adicionar
      </button>
      {estado.erros && <p className="text-sm text-red-600 sm:col-span-5">{Object.values(estado.erros)[0]}</p>}
    </form>
  );
}

export function Desconto({ osId, inicial }: { osId: string; inicial: string }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(definirDesconto.bind(null, osId), {});
  const erro = estado.erros?.desconto;
  return (
    <form action={acao} className="flex flex-wrap items-end gap-2">
      <label className={`campo w-28 ${erro ? "campo-erro" : ""}`}>
        <span>Desconto</span>
        <input name="desconto" inputMode="decimal" defaultValue={inicial} key={inicial} />
      </label>
      <BotaoEnviar className="btn-secundario">Aplicar</BotaoEnviar>
      {erro && <p className="basis-full text-right text-sm text-red-600">{erro}</p>}
    </form>
  );
}

export function AtualizarStatus({ osId, status, opcoes, diagnostico }: { osId: string; status: StatusOS; opcoes: StatusOS[]; diagnostico: string }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(mudarStatus.bind(null, osId), {});
  const erro = estado.erros && Object.values(estado.erros)[0];
  return (
    <form action={acao} className="grid gap-3 sm:grid-cols-4">
      <label className={`campo ${estado.erros?.status ? "campo-erro" : ""}`}>
        <span>Novo status</span>
        <select name="status" defaultValue={status} key={status}>
          {opcoes.map((s) => (
            <option key={s} value={s}>
              {STATUS_OS[s].label}
            </option>
          ))}
        </select>
      </label>
      <label className="campo sm:col-span-3">
        <span>Anotação</span>
        <input name="nota" placeholder="ex.: cliente aprovou por telefone" />
      </label>
      <label className="campo sm:col-span-4">
        <span>Diagnóstico técnico</span>
        <textarea name="diagnostico" rows={2} defaultValue={diagnostico} key={diagnostico} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
        <BotaoEnviar enviando="Atualizando…">Atualizar</BotaoEnviar>
        {erro && <span className="text-sm text-red-600">{erro}</span>}
      </div>
    </form>
  );
}

export function PagamentoOS({ osId, sugerido }: { osId: string; sugerido: string }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(registrarPagamentoOS.bind(null, osId), {});
  const [forma, setForma] = useState("PIX");
  // Com erro, o que foi digitado volta para o formulário.
  const v = estado.valores ?? {};
  return (
    <form action={acao} key={estado.mensagem} className={`grid items-end gap-3 ${forma === "BOLETO" || forma === "A_PRAZO" ? "sm:grid-cols-[1fr_8rem_5rem_9rem_auto]" : "sm:grid-cols-[1fr_9rem_7rem_auto]"}`}>
      <label className="campo">
        <span>Forma</span>
        <select name="forma" value={forma} onChange={(e) => setForma(e.target.value)}>
          {Object.entries(FORMAS_PAGAMENTO)
            .filter(([f]) => f !== "TROCA")
            .map(([f, l]) => (
              <option key={f} value={f}>
                {l}
              </option>
            ))}
        </select>
      </label>
      <label className={`campo ${estado.erros?.valor ? "campo-erro" : ""}`}>
        <span>Valor (R$)</span>
        <input name="valor" inputMode="decimal" defaultValue={v.valor ?? sugerido} />
      </label>
      {forma === "CREDITO" || forma === "BOLETO" || forma === "A_PRAZO" ? (
        <label className="campo">
          <span>Parcelas</span>
          <select name="parcelas" defaultValue={v.parcelas ?? "1"} key={v.parcelas}>
            {Array.from({ length: 12 }, (_, k) => k + 1).map((n) => (
              <option key={n} value={n}>
                {n}x
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div />
      )}
      {forma === "BOLETO" || forma === "A_PRAZO" ? (
        <label className={`campo ${estado.erros?.primeiroVencimento ? "campo-erro" : ""}`}>
          <span>1º vencimento</span>
          <input type="date" name="primeiroVencimento" defaultValue={v.primeiroVencimento} />
        </label>
      ) : null}
      <button className="btn-primario" disabled={pendente}>
        {pendente ? "Registrando…" : "Registrar pagamento"}
      </button>
      {(estado.mensagem || estado.erros) && (
        <p className={`text-sm col-span-full ${estado.erros ? "text-red-600" : "text-green-700"}`}>
          {estado.mensagem ?? Object.values(estado.erros ?? {})[0]}
        </p>
      )}
    </form>
  );
}

export function AdicionarFotos({ osId, restantes }: { osId: string; restantes: number }) {
  const [fotos, setFotos] = useState<FotoEnviada[]>([]);
  const [pendente, iniciar] = useTransition();
  if (restantes <= 0) return <p className="text-sm text-zinc-500">Limite de fotos atingido.</p>;
  return (
    <div className="space-y-3">
      <FotosAparelho fotos={fotos} onChange={setFotos} maximo={restantes} />
      {fotos.length > 0 && (
        <button
          type="button"
          className="btn-primario"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              await adicionarFotos(osId, fotosParaEnvio(fotos));
              setFotos([]);
            })
          }
        >
          {pendente ? "Salvando…" : `Salvar ${fotos.length} foto(s) na OS`}
        </button>
      )}
    </div>
  );
}
