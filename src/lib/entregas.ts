import type { ModalidadeEntrega, StatusEntrega, TipoEntrega } from "@prisma/client";
import { z } from "zod";
import { paraNumero } from "./estoque";
import { ymdValido } from "./tempo";

export const TIPOS_ENTREGA: Record<TipoEntrega, string> = { ENTREGA: "Entrega", COLETA: "Coleta (buscar no cliente)" };

export const MODALIDADES_ENTREGA: Record<ModalidadeEntrega, { label: string; dica: string }> = {
  LOJA: { label: "Equipe da loja", dica: "Alguém da loja vai e volta" },
  MOTOBOY: { label: "Motoboy", dica: "Motoboy parceiro ou de aplicativo" },
  TERCEIRIZADO: { label: "Serviço terceirizado", dica: "Lalamove, Loggi, Uber Flash, transportadora..." },
};

// Sugestões para o campo de quem vai levar.
export const PRESTADORES_SUGERIDOS = ["Lalamove", "Loggi", "Uber Flash", "99 Entrega", "iFood Entrega Fácil", "Correios (Sedex)"];

/**
 * Estimativa do motoboy: ele precisa chegar à loja para retirar o aparelho e depois ir até o cliente.
 * O custo é taxa fixa + valor por km (só ida, como cobram os motoboys e aplicativos), arredondado ao real.
 */
export function estimarMotoboy(distanciaKm: number, minutosIda: number, cfg: { taxaFixa: number; valorKm: number; minutosRetirada: number }) {
  return {
    minutos: Math.ceil((cfg.minutosRetirada + minutosIda) / 5) * 5,
    custo: Math.max(0, Math.round(cfg.taxaFixa + distanciaKm * cfg.valorKm)),
  };
}

export const STATUS_ENTREGA: Record<StatusEntrega, { label: string; cor: string }> = {
  PENDENTE: { label: "A fazer", cor: "bg-sky-100 text-sky-800" },
  EM_ROTA: { label: "Saiu", cor: "bg-amber-100 text-amber-800" },
  CONCLUIDA: { label: "Concluída", cor: "bg-green-100 text-green-800" },
  CANCELADA: { label: "Cancelada", cor: "bg-red-100 text-red-800" },
};

// Para onde cada status pode ir. Concluída e cancelada são finais.
export const TRANSICOES_ENTREGA: Record<StatusEntrega, StatusEntrega[]> = {
  PENDENTE: ["EM_ROTA", "CANCELADA"],
  EM_ROTA: ["CONCLUIDA", "CANCELADA"],
  CONCLUIDA: [],
  CANCELADA: [],
};
export const statusEntregaValido = (v: unknown): v is StatusEntrega => typeof v === "string" && Object.hasOwn(STATUS_ENTREGA, v);

// Endereço em uma linha, do jeito que serviços de mapa entendem.
export function enderecoEmLinha(e: { logradouro?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null; cep?: string | null }) {
  const rua = [e.logradouro, e.numero].filter(Boolean).join(", ");
  const cidade = [e.cidade, e.uf].filter(Boolean).join(" - ");
  const cep = e.cep ? e.cep.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2") : null;
  return [rua, e.bairro, cidade, cep].filter(Boolean).join(", ");
}

// Ida + tempo no local + volta, arredondado para cima em múltiplos de 5 minutos.
export function tempoTotal(minutosIda: number, minutosNoLocal: number) {
  return Math.ceil((minutosIda * 2 + minutosNoLocal) / 5) * 5;
}

export function formatarDuracao(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export const entregaSchema = z.object({
  tipo: z.enum(["ENTREGA", "COLETA"]),
  clienteId: z.string().min(1, "Escolha o cliente"),
  endereco: z.string().trim().min(8, "Informe o endereço completo"),
  dia: z
    .string()
    .trim()
    .refine((v) => !v || ymdValido(v), "Data inválida")
    .transform((v) => v || null),
  hora: z
    .string()
    .trim()
    .refine((v) => !v || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "Use HH:MM")
    .transform((v) => v || null),
  vendaId: z.string().trim().transform((v) => v || null),
  osId: z.string().trim().transform((v) => v || null),
  taxa: z
    .unknown()
    .transform(paraNumero)
    .refine((v) => Number.isFinite(v) && v >= 0, "Valor inválido"),
  distanciaKm: z.string().transform((v) => (v ? Number(v) : null)),
  minutosIda: z.string().transform((v) => (v ? Math.round(Number(v)) : null)),
  minutosTotal: z.string().transform((v) => (v ? Math.round(Number(v)) : null)),
  responsavelId: z.string().trim().transform((v) => v || null),
  modalidade: z.enum(["LOJA", "MOTOBOY", "TERCEIRIZADO"]).catch("LOJA"),
  // Os campos do motoboy/terceirizado só existem no formulário quando essa opção está escolhida.
  prestador: z.string().default("").pipe(z.string().trim().max(80)).transform((v) => v || null),
  minutosPrestador: z
    .string()
    .default("")
    .pipe(z.string().trim())
    .refine((v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 24 * 60), "Tempo inválido")
    .transform((v) => (v ? Math.round(Number(v)) : null)),
  custo: z
    .unknown()
    .optional()
    .transform(paraNumero)
    .refine((v) => Number.isFinite(v) && v >= 0, "Valor inválido"),
  observacoes: z.string().trim().max(500).transform((v) => v || null),
});
