"use client";

import { useState } from "react";
import { TEMAS, type Tema } from "@/lib/tema";

function aplicarTema(tema: Tema) {
  document.documentElement.setAttribute("data-tema", tema);
  document.cookie = `tema=${tema}; path=/; max-age=31536000; samesite=lax`;
}

export function EscolherTema({ inicial }: { inicial: Tema }) {
  const [tema, setTema] = useState<Tema>(inicial);

  function escolher(novo: Tema) {
    setTema(novo);
    aplicarTema(novo);
  }

  return (
    <div role="radiogroup" aria-label="Aparência" className="flex rounded-full bg-zinc-200/70 p-0.5 text-xs">
      {(Object.keys(TEMAS) as Tema[]).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={tema === t}
          onClick={() => escolher(t)}
          className={`flex-1 rounded-full px-2 py-1 transition ${tema === t ? "bg-cartao text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
        >
          {TEMAS[t]}
        </button>
      ))}
    </div>
  );
}
