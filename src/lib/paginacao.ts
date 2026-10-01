// Paginação simples das listas (?pagina=N).
export const POR_PAGINA = 50;

/** Página pedida na URL (1 quando ausente ou inválida). */
export function lerPagina(v: unknown): number {
  const n = typeof v === "string" && /^\d{1,6}$/.test(v) ? Number(v) : 1;
  return Math.max(1, n);
}

/** Faixa mostrada ("Mostrando X–Y de N") e se há página anterior/próxima. */
export function faixaDaPagina(pagina: number, total: number, porPagina = POR_PAGINA) {
  const ultima = Math.max(1, Math.ceil(total / porPagina));
  const atual = Math.min(pagina, ultima);
  const de = total ? (atual - 1) * porPagina + 1 : 0;
  const ate = Math.min(total, atual * porPagina);
  return { atual, ultima, de, ate, total, pular: (atual - 1) * porPagina, anterior: atual > 1, proxima: atual < ultima };
}

/** Link para outra página mantendo os demais filtros. */
export function hrefPagina(base: string, filtros: Record<string, string | undefined>, pagina: number): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filtros)) if (v) p.set(k, v);
  if (pagina > 1) p.set("pagina", String(pagina));
  const q = p.toString();
  return q ? `${base}?${q}` : base;
}
