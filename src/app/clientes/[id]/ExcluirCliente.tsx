"use client";

import { useState, useTransition } from "react";
import { excluirCliente } from "../actions";

export function ExcluirCliente({ id }: { id: string }) {
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pendente}
        className="btn-secundario text-red-700"
        onClick={() => {
          if (!confirm("Excluir este cliente?")) return;
          iniciar(async () => {
            const r = await excluirCliente(id);
            if (r?.erro) setErro(r.erro);
          });
        }}
      >
        Excluir
      </button>
      {erro && <p className="mt-1 text-sm text-red-600">{erro}</p>}
    </div>
  );
}
