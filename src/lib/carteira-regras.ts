import { somarDias } from "./tempo";

// Regras da carteira de créditos (sem banco, para testar).

export type SituacaoCarteira = "ISENTA" | "ATIVA" | "TOLERANCIA" | "CONSULTA";

const centavos = (v: number) => Math.round(v * 100);

/**
 * Dias a descontar entre o último dia cobrado e hoje (AAAA-MM-DD, horário de Brasília).
 * Para de cobrar quando o saldo passaria do limite de tolerância: dias sem poder usar não são cobrados.
 */
export function planejarDiarias(p: { ultimoDia: string; hoje: string; saldo: number; diaria: number; diasTolerancia: number }): string[] {
  const dias: string[] = [];
  if (p.diaria <= 0) return dias;
  const limite = -centavos(p.diaria) * p.diasTolerancia;
  let saldo = centavos(p.saldo);
  for (let d = somarDias(p.ultimoDia, 1); d <= p.hoje; d = somarDias(d, 1)) {
    if (saldo - centavos(p.diaria) < limite) break;
    saldo -= centavos(p.diaria);
    dias.push(d);
  }
  return dias;
}

/**
 * Situação de hoje. A loja usa o sistema no dia em que a diária foi descontada;
 * quando o saldo não cobre nem a tolerância, a diária não é descontada e a loja fica só consultando.
 */
export function situacaoDoSaldo(p: { isenta: boolean; saldo: number; diaria: number; diariaDeHojePaga: boolean }): SituacaoCarteira {
  if (p.isenta || p.diaria <= 0) return p.isenta ? "ISENTA" : "ATIVA";
  if (!p.diariaDeHojePaga) return "CONSULTA";
  return p.saldo >= 0 ? "ATIVA" : "TOLERANCIA";
}

/** Dias de uso que o saldo ainda cobre. */
export function diasRestantes(saldo: number, diaria: number): number {
  if (diaria <= 0) return Infinity;
  return Math.max(0, Math.floor(centavos(saldo) / centavos(diaria)));
}

export const SITUACOES: Record<SituacaoCarteira, { label: string; tom: string }> = {
  ISENTA: { label: "Isenta", tom: "bg-zinc-100 text-zinc-700" },
  ATIVA: { label: "Ativa", tom: "bg-green-100 text-green-800" },
  TOLERANCIA: { label: "Saldo esgotado", tom: "bg-amber-100 text-amber-800" },
  CONSULTA: { label: "Só consulta", tom: "bg-red-100 text-red-800" },
};
