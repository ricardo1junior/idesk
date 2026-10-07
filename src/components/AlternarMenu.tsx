"use client";

// Esconde e mostra o menu lateral. O estado fica no atributo data-menu da área do app
// (o CSS cuida do resto) e num cookie, para o servidor já desenhar a página certa no próximo acesso.
function alternar(ocultar: boolean) {
  document.querySelector("[data-menu]")?.setAttribute("data-menu", ocultar ? "oculto" : "visivel");
  document.cookie = `menu=${ocultar ? "oculto" : "visivel"}; path=/; max-age=31536000; samesite=lax`;
}

const Icone = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]" aria-hidden="true">
    <path d={d} />
  </svg>
);

export function EsconderMenu() {
  return (
    <button
      type="button"
      onClick={() => alternar(true)}
      title="Esconder menu"
      aria-label="Esconder menu"
      className="grid size-7 shrink-0 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-900/[0.06] hover:text-zinc-900"
    >
      <Icone d="M15 6l-6 6 6 6" />
    </button>
  );
}

export function MostrarMenu() {
  return (
    <button
      type="button"
      onClick={() => alternar(false)}
      title="Mostrar menu"
      aria-label="Mostrar menu"
      className="botao-mostrar-menu fixed top-4 left-4 z-30 grid size-10 place-items-center rounded-full border border-zinc-200 bg-cartao/90 text-zinc-700 shadow-sm backdrop-blur-xl transition hover:text-zinc-900 print:hidden"
    >
      <Icone d="M4 6h16M4 12h16M4 18h16" />
    </button>
  );
}
