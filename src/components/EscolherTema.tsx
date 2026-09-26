"use client";

// Chave única claro/escuro. A posição vem do CSS (variável --escuro), então já nasce certa
// mesmo quando o tema segue o sistema, sem piscar ao carregar.
function alternarTema() {
  const raiz = document.documentElement;
  const escuroAgora = getComputedStyle(raiz).getPropertyValue("--escuro").trim() === "1";
  const novo = escuroAgora ? "claro" : "escuro";
  raiz.setAttribute("data-tema", novo);
  document.cookie = `tema=${novo}; path=/; max-age=31536000; samesite=lax`;
}

export function EscolherTema() {
  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label="Alternar entre modo claro e escuro"
      title="Modo claro / escuro"
      className="relative h-7 w-12 shrink-0 rounded-full bg-zinc-300 transition-colors"
    >
      <span className="chave-tema absolute top-0.5 left-0.5 grid size-6 place-items-center rounded-full bg-cartao shadow-sm transition-transform">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="icone-sol absolute size-4 fill-none stroke-amber-500 stroke-2 [stroke-linecap:round]">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="icone-lua absolute size-4 fill-zinc-900">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </span>
    </button>
  );
}
