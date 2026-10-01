"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { mudarStatusAgendamento } from "./actions";

// Botão de mudança de status do agendamento: trava enquanto envia e mostra o motivo quando não dá.
export function BotaoStatus({ id, status, rotulo, confirmar }: { id: string; status: string; rotulo: string; confirmar?: string }) {
  const [erro, acao] = useActionState(mudarStatusAgendamento.bind(null, id, status), null);
  return (
    <form action={acao} className="contents">
      <BotaoEnviar className="text-xs text-link hover:underline disabled:opacity-50" confirmar={confirmar}>
        {rotulo}
      </BotaoEnviar>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </form>
  );
}
