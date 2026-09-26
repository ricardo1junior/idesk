// Datas e horas sempre no horário de Brasília, mesmo com o servidor em UTC (ex.: Vercel).
// O Brasil não tem horário de verão desde 2019, então o fuso é fixo em -03:00.

export const FUSO = "America/Sao_Paulo";
const OFFSET = "-03:00";

// "2026-09-26" + "09:30" → instante correspondente em Brasília.
export function dataHoraLocal(ymd: string, hhmm: string): Date {
  return new Date(`${ymd}T${hhmm}:00${OFFSET}`);
}

// Dia (AAAA-MM-DD) de um instante, em Brasília.
export function ymdLocal(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function somarDias(ymd: string, dias: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diaDaSemana(ymd: string): number {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}

export const horaLocal = (d: Date) => d.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
export const dataLocal = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: FUSO });
export const diaPorExtenso = (ymd: string) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
export const diaCurto = (ymd: string) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" });

export const ymdValido = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
