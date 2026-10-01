import type { MotivoAgendamento, StatusAgendamento } from "@prisma/client";
import { z } from "zod";
import { dataHoraLocal, diaDaSemana, ymdValido } from "./tempo";

export const MOTIVOS: Record<MotivoAgendamento, string> = {
  REPARO: "Reparo / assistência",
  ORCAMENTO: "Orçamento",
  COMPRA: "Compra",
  RETIRADA: "Retirar aparelho",
  TROCA: "Troca (trade-in)",
  OUTRO: "Outro",
};

export const STATUS_AGENDAMENTO: Record<StatusAgendamento, { label: string; cor: string }> = {
  AGENDADO: { label: "Agendado", cor: "bg-sky-100 text-sky-800" },
  CONFIRMADO: { label: "Confirmado", cor: "bg-green-100 text-green-800" },
  ATENDIDO: { label: "Atendido", cor: "bg-zinc-200 text-zinc-700" },
  FALTOU: { label: "Faltou", cor: "bg-amber-100 text-amber-800" },
  CANCELADO: { label: "Cancelado", cor: "bg-red-100 text-red-800" },
};

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Status que ocupam vaga na agenda.
export const OCUPA_VAGA: StatusAgendamento[] = ["AGENDADO", "CONFIRMADO", "ATENDIDO"];

// Para onde cada status pode ir. Atendido é final; faltou/cancelado podem ser reativados.
export const TRANSICOES_AGENDA: Record<StatusAgendamento, StatusAgendamento[]> = {
  AGENDADO: ["CONFIRMADO", "ATENDIDO", "FALTOU", "CANCELADO"],
  CONFIRMADO: ["ATENDIDO", "FALTOU", "CANCELADO"],
  ATENDIDO: [],
  FALTOU: ["AGENDADO"],
  CANCELADO: ["AGENDADO"],
};
export const statusAgendamentoValido = (v: unknown): v is StatusAgendamento => typeof v === "string" && Object.hasOwn(STATUS_AGENDAMENTO, v);

export type ConfigAgenda = {
  abreAs: string;
  fechaAs: string;
  diasSemana: number[];
  duracaoAtendimento: number;
  atendimentosSimultaneos: number;
};

export const CONFIG_PADRAO: ConfigAgenda = { abreAs: "09:00", fechaAs: "18:00", diasSemana: [1, 2, 3, 4, 5, 6], duracaoAtendimento: 30, atendimentosSimultaneos: 1 };

export type Horario = { inicio: Date; fim: Date; ocupados: number; livre: boolean; passado: boolean };

type Marcado = { inicio: Date; fim: Date; status: StatusAgendamento };

const sobrepoe = (a: { inicio: Date; fim: Date }, b: { inicio: Date; fim: Date }) => a.inicio < b.fim && b.inicio < a.fim;

// Horários do dia com quantas vagas já estão ocupadas.
export function horariosDoDia(ymd: string, config: ConfigAgenda, marcados: Marcado[], agora = new Date()): Horario[] {
  if (!config.diasSemana.includes(diaDaSemana(ymd))) return [];
  const abre = dataHoraLocal(ymd, config.abreAs).getTime();
  const fecha = dataHoraLocal(ymd, config.fechaAs).getTime();
  const passo = Math.max(5, config.duracaoAtendimento) * 60_000;
  const ativos = marcados.filter((m) => OCUPA_VAGA.includes(m.status));
  const lista: Horario[] = [];
  for (let t = abre; t + passo <= fecha; t += passo) {
    const h = { inicio: new Date(t), fim: new Date(t + passo) };
    const ocupados = ativos.filter((m) => sobrepoe(m, h)).length;
    const passado = h.fim.getTime() <= agora.getTime();
    lista.push({ ...h, ocupados, passado, livre: !passado && ocupados < config.atendimentosSimultaneos });
  }
  return lista;
}

// Confere se um novo agendamento cabe: dentro do horário da loja e com vaga em todo o intervalo.
export function conflitoAgendamento(ymd: string, inicio: Date, fim: Date, config: ConfigAgenda, marcados: Marcado[]): string | null {
  if (!config.diasSemana.includes(diaDaSemana(ymd))) return "A loja não abre neste dia.";
  if (inicio < dataHoraLocal(ymd, config.abreAs) || fim > dataHoraLocal(ymd, config.fechaAs)) return "Fora do horário de funcionamento.";
  const ativos = marcados.filter((m) => OCUPA_VAGA.includes(m.status));
  // Verifica minuto a minuto nos pontos de início dos agendamentos existentes (o pico de ocupação acontece em um deles).
  const pontos = [inicio, ...ativos.map((m) => m.inicio).filter((p) => p > inicio && p < fim)];
  for (const p of pontos) {
    const naquele = ativos.filter((m) => m.inicio <= p && p < m.fim).length;
    if (naquele >= config.atendimentosSimultaneos) return "Este horário já está cheio. Escolha outro.";
  }
  return null;
}

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

export const agendamentoSchema = z.object({
  dia: z.string().refine(ymdValido, "Escolha o dia"),
  hora,
  duracao: z.coerce.number().int().min(5).max(480),
  clienteId: z.string().trim().transform((v) => v || null),
  nome: z.string().trim().min(2, "Informe o nome do cliente"),
  telefone: z.string().trim().transform((v) => v.replace(/\D/g, "") || null),
  motivo: z.enum(Object.keys(MOTIVOS) as [MotivoAgendamento, ...MotivoAgendamento[]]),
  aparelho: z.string().trim().max(80).transform((v) => v || null),
  observacoes: z.string().trim().max(500).transform((v) => v || null),
});

export const configLojaSchema = z
  .object({
    endereco: z.string().trim().max(200).transform((v) => v || null),
    abreAs: hora,
    fechaAs: hora,
    diasSemana: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Escolha pelo menos um dia"),
    duracaoAtendimento: z.coerce.number().int().min(5, "Mínimo 5 minutos").max(240),
    atendimentosSimultaneos: z.coerce.number().int().min(1).max(20),
    minutosNoLocalEntrega: z.coerce.number().int().min(0).max(240),
  })
  .refine((c) => c.abreAs < c.fechaAs, { message: "O horário de fechar deve ser depois do de abrir", path: ["fechaAs"] });
