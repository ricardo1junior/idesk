"use client";

import { useActionState, useEffect, useState } from "react";
import { Campo } from "@/components/Campos";
import { MOTIVOS } from "@/lib/agenda";
import type { EstadoFormulario } from "@/lib/clientes";
import { formatarTelefone } from "@/lib/documentos";
import { buscarClientesAgenda, criarAgendamento } from "./actions";

type Cliente = { id: string; nome: string; telefone: string | null; whatsapp: string | null };

export function NovoAgendamento({ dia, horarios, hora, duracao }: { dia: string; horarios: string[]; hora: string; duracao: number }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(criarAgendamento, {});
  const v = estado.mensagem ? {} : (estado.valores ?? {});
  const erro = (c: string) => estado.erros?.[c];
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<Cliente[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [nome, setNome] = useState(v.nome ?? "");
  const [telefone, setTelefone] = useState(v.telefone ?? "");

  useEffect(() => {
    const t = setTimeout(() => (termo.trim().length >= 2 && !cliente ? buscarClientesAgenda(termo).then(setOpcoes) : setOpcoes([])), 250);
    return () => clearTimeout(t);
  }, [termo, cliente]);

  const escolher = (c: Cliente) => {
    setCliente(c);
    setNome(c.nome);
    setTelefone(formatarTelefone(c.whatsapp || c.telefone || ""));
    setOpcoes([]);
    setTermo("");
  };

  return (
    <form action={acao} key={estado.mensagem} className="space-y-3">
      <input type="hidden" name="dia" value={dia} />
      <input type="hidden" name="clienteId" value={cliente?.id ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Horário" erro={erro("hora")}>
          <select name="hora" defaultValue={v.hora ?? hora}>
            {horarios.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Duração (min)">
          <input name="duracao" type="number" min={5} step={5} defaultValue={v.duracao ?? duracao} />
        </Campo>
      </div>
      {!cliente && (
        <div className="relative">
          <Campo label="Cliente cadastrado (opcional)">
            <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar por nome ou telefone" />
          </Campo>
          {opcoes.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-cartao text-sm shadow-lg">
              {opcoes.map((c) => (
                <li key={c.id}>
                  <button type="button" className="w-full px-3 py-2 text-left hover:bg-zinc-50" onClick={() => escolher(c)}>
                    {c.nome} <span className="text-xs text-zinc-500">{formatarTelefone(c.whatsapp || c.telefone || "")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {cliente && (
        <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm">
          <span>
            Cliente: <b>{cliente.nome}</b>
          </span>
          <button type="button" className="text-xs text-link hover:underline" onClick={() => setCliente(null)}>
            Trocar
          </button>
        </div>
      )}
      <Campo label="Nome" erro={erro("nome")}>
        <input name="nome" data-mascara="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </Campo>
      <Campo label="WhatsApp / telefone">
        <input name="telefone" data-mascara="telefone" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
      </Campo>
      <Campo label="Motivo">
        <select name="motivo" defaultValue={v.motivo ?? "REPARO"}>
          {Object.entries(MOTIVOS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Aparelho">
        <input name="aparelho" defaultValue={v.aparelho} placeholder="ex.: iPhone 13 Pro" />
      </Campo>
      <Campo label="Observações">
        <textarea name="observacoes" rows={2} defaultValue={v.observacoes} placeholder="ex.: tela quebrada, quer orçamento" />
      </Campo>
      <button className="btn-primario w-full" disabled={pendente}>
        {pendente ? "Agendando…" : "Agendar"}
      </button>
      {estado.mensagem && <p className="text-sm text-green-700">{estado.mensagem}</p>}
    </form>
  );
}
