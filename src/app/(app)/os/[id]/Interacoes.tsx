"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { PadraoSenha } from "@/components/PadraoSenha";
import type { EstadoFormulario } from "@/lib/clientes";
import { FORMAS_PAGAMENTO } from "@/lib/vendas";
import { FotosAparelho, fotosParaEnvio, type FotoEnviada } from "@/components/FotosAparelho";
import { adicionarFotos, adicionarItem, registrarPagamentoOS, revelarSenha } from "../actions";

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

export function PagamentoOS({ osId, sugerido }: { osId: string; sugerido: string }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(registrarPagamentoOS.bind(null, osId), {});
  const [forma, setForma] = useState("PIX");
  return (
    <form action={acao} key={estado.mensagem} className="grid items-end gap-3 sm:grid-cols-[1fr_9rem_7rem_10rem_auto]">
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
        <input name="valor" inputMode="decimal" defaultValue={sugerido} />
      </label>
      {forma === "CREDITO" || forma === "BOLETO" || forma === "A_PRAZO" ? (
        <label className="campo">
          <span>Parcelas</span>
          <select name="parcelas" defaultValue="1">
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
          <input type="date" name="primeiroVencimento" />
        </label>
      ) : (
        <div />
      )}
      <button className="btn-primario" disabled={pendente}>
        Registrar pagamento
      </button>
      {(estado.mensagem || estado.erros) && (
        <p className={`text-sm sm:col-span-5 ${estado.erros ? "text-red-600" : "text-green-700"}`}>
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
