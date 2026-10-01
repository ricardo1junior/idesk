// Esqueleto exibido na hora enquanto a próxima tela carrega (a navegação não "trava" no clique).
export default function Carregando() {
  return (
    <div className="max-w-5xl animate-pulse space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-md bg-zinc-200/80" />
        <div className="h-4 w-80 max-w-full rounded-md bg-zinc-200/60" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-zinc-200 bg-cartao" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-cartao">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 border-t border-zinc-100 px-4 py-4 first:border-t-0">
            <div className="h-4 w-1/4 rounded bg-zinc-200/70" />
            <div className="h-4 w-1/3 rounded bg-zinc-200/50" />
            <div className="ml-auto h-4 w-20 rounded bg-zinc-200/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
