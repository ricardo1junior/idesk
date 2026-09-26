// Referências de preço para avaliar um aparelho recebido na troca: histórico da própria loja
// e atalhos de pesquisa nos sites de anúncios (o Mercado Livre fechou a busca pública da API).

export type ResumoPrecos = { quantidade: number; media: number; minimo: number; maximo: number } | null;

export function resumirPrecos(valores: number[]): ResumoPrecos {
  const v = valores.filter((x) => Number.isFinite(x) && x > 0);
  if (!v.length) return null;
  const soma = v.reduce((s, x) => s + x, 0);
  return { quantidade: v.length, media: Math.round((soma / v.length) * 100) / 100, minimo: Math.min(...v), maximo: Math.max(...v) };
}

export function termoDePesquisa(modelo: string, capacidade?: string): string {
  return [modelo, capacidade?.replace(/\s+/g, "")].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function linksDePesquisa(modelo: string, capacidade?: string): { site: string; url: string }[] {
  const termo = termoDePesquisa(modelo, capacidade);
  if (!termo) return [];
  const slug = `${termo} usado`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const q = encodeURIComponent(`${termo} usado`);
  return [
    { site: "Mercado Livre", url: `https://lista.mercadolivre.com.br/${slug}` },
    { site: "OLX", url: `https://www.olx.com.br/brasil?q=${encodeURIComponent(termo)}` },
    { site: "Google Shopping", url: `https://www.google.com/search?tbm=shop&q=${q}` },
  ];
}
