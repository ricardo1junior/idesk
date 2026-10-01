// Leitura de valores digitados em reais. Aceita "1.299", "1.299,90", "1299.90", "R$ 15,5" e "-20".
// A última vírgula ou ponto seguido de 1 ou 2 dígitos é o separador de centavos; os demais são de milhar.
const MILHAR = /^-?\d{1,3}([.,]\d{3})+$/;

export function lerReais(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/R\$|\s/g, "");
  if (!/^-?[\d.,]+$/.test(s)) return NaN;
  const decimal = s.match(/[.,](\d{1,2})$/);
  if (decimal && !MILHAR.test(s)) {
    const inteiro = s.slice(0, decimal.index).replace(/[.,]/g, "");
    return Number(`${inteiro}.${decimal[1]}`);
  }
  // "1.500" e "1.234.567" são milhares; "12.3456" é ambíguo.
  if (/[.,]/.test(s) && !MILHAR.test(s)) return NaN;
  return Number(s.replace(/[.,]/g, ""));
}
