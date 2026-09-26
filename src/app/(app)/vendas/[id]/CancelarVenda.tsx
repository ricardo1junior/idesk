"use client";

import { useState, useTransition } from "react";
import { cancelarVenda } from "../actions";

export function CancelarVenda({ id }: { id: string }) {
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  return (
    <div className="text-right">
      <button
        type="button"
        className="btn-secundario text-red-700"
        disabled={pendente}
        onClick={() => {
          if (!confirm("Cancelar esta venda? Os itens voltam ao estoque e o aparelho da troca volta para o cliente.")) return;
          iniciar(async () => {
            const r = await cancelarVenda(id);
            if (r.erro) setErro(r.erro);
          });
        }}
      >
        Cancelar venda
      </button>
      {erro && <p className="mt-1 max-w-xs text-sm text-red-600">{erro}</p>}
    </div>
  );
}
