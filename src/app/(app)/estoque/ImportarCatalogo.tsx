"use client";

import { useState, useTransition } from "react";
import { importarCatalogoApple } from "./actions";

export function ImportarCatalogo() {
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<string>();

  function importar() {
    if (!confirm("Cadastrar todos os modelos Apple como produtos, com preço zerado? Os que já existem no estoque são pulados.")) return;
    iniciar(async () => {
      const r = await importarCatalogoApple();
      setResultado(r.criados ? `${r.criados} produtos criados${r.jaExistiam ? `, ${r.jaExistiam} já existiam` : ""}.` : "Todos os modelos já estavam no estoque.");
    });
  }

  return (
    <span className="flex items-center gap-3">
      {resultado && <span className="text-sm text-green-700">{resultado}</span>}
      <button type="button" onClick={importar} disabled={pendente} className="btn-secundario">
        {pendente ? "Importando..." : "Importar modelos Apple"}
      </button>
    </span>
  );
}
