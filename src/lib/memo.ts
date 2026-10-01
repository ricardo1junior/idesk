// Memória curta no processo para leituras repetidas a cada requisição (sessão, carteira, configuração).
// Cada servidor guarda a sua cópia por poucos segundos; quem altera o dado chama `esquecer`.
export function memoComValidade<K, V>(ms: number, buscar: (chave: K) => Promise<V>) {
  const guardados = new Map<K, { ate: number; valor: Promise<V> }>();
  const ler = (chave: K): Promise<V> => {
    const agora = Date.now();
    const g = guardados.get(chave);
    if (g && g.ate > agora) return g.valor;
    if (guardados.size > 2000) guardados.clear();
    const valor = buscar(chave);
    guardados.set(chave, { ate: agora + ms, valor });
    valor.catch(() => guardados.delete(chave));
    return valor;
  };
  return Object.assign(ler, { esquecer: (chave: K) => void guardados.delete(chave), limpar: () => guardados.clear() });
}
