import type { StatusOS, TipoSenha } from "@prisma/client";
import { z } from "zod";

export const STATUS_OS: Record<StatusOS, { label: string; cor: string }> = {
  ABERTA: { label: "Aberta", cor: "bg-sky-100 text-sky-800" },
  EM_ANALISE: { label: "Em análise", cor: "bg-indigo-100 text-indigo-800" },
  ORCAMENTO_ENVIADO: { label: "Orçamento enviado", cor: "bg-amber-100 text-amber-800" },
  APROVADA: { label: "Aprovada", cor: "bg-teal-100 text-teal-800" },
  EM_EXECUCAO: { label: "Em execução", cor: "bg-violet-100 text-violet-800" },
  CONCLUIDA: { label: "Concluída", cor: "bg-green-100 text-green-800" },
  ENTREGUE: { label: "Entregue", cor: "bg-zinc-200 text-zinc-700" },
  CANCELADA: { label: "Cancelada", cor: "bg-red-100 text-red-800" },
};

export const TIPOS_SENHA: Record<TipoSenha, string> = {
  NENHUMA: "Sem senha",
  NUMERICA: "Numérica (código)",
  ALFANUMERICA: "Alfanumérica",
  PADRAO: "Padrão (desenho)",
  NAO_INFORMADA: "Cliente não informou",
};

// Itens verificados na entrada do aparelho.
export const CHECKLIST = [
  { id: "liga", label: "Liga" },
  { id: "tela", label: "Tela / touch" },
  { id: "faceTouchId", label: "Face ID / Touch ID" },
  { id: "cameraTraseira", label: "Câmera traseira" },
  { id: "cameraFrontal", label: "Câmera frontal" },
  { id: "altoFalante", label: "Alto-falante" },
  { id: "microfone", label: "Microfone" },
  { id: "botoes", label: "Botões" },
  { id: "carregamento", label: "Carregamento" },
  { id: "wifiBluetooth", label: "Wi-Fi / Bluetooth" },
  { id: "sinal", label: "Sinal / chip" },
] as const;

export const RESULTADOS_CHECKLIST = { OK: "OK", DEFEITO: "Defeito", NAO_TESTADO: "Não testado" } as const;
export type ResultadoChecklist = keyof typeof RESULTADOS_CHECKLIST;

export const ACESSORIOS = ["Capa", "Película", "Carregador", "Cabo", "Chip", "Caixa", "Pulseira", "Caneta"] as const;

const opcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const aberturaOSSchema = z
  .object({
    clienteId: z.string().min(1, "Selecione o cliente"),
    modelo: z.string().trim().min(2, "Informe o modelo do aparelho"),
    cor: opcional,
    capacidade: opcional,
    imei: opcional.refine((v) => !v || /^\d{15}$/.test(v), "IMEI deve ter 15 dígitos"),
    serial: opcional,
    saudeBateria: opcional.refine((v) => !v || (Number(v) >= 0 && Number(v) <= 100), "Entre 0 e 100"),
    icloudBloqueado: z.enum(["", "sim", "nao"]).optional(),
    tipoSenha: z.enum(["NENHUMA", "NUMERICA", "ALFANUMERICA", "PADRAO", "NAO_INFORMADA"]),
    senha: opcional,
    marcasUso: opcional,
    acessoriosOutros: opcional,
    precisaBackup: z.enum(["sim"]).optional(),
    backupObs: opcional,
    defeitoRelatado: z.string().trim().min(3, "Descreva o defeito relatado"),
    previsaoEntrega: opcional,
    garantiaDias: z.coerce.number().int().min(0).default(90),
  })
  .superRefine((d, ctx) => {
    const exigeSenha = d.tipoSenha === "NUMERICA" || d.tipoSenha === "ALFANUMERICA" || d.tipoSenha === "PADRAO";
    if (exigeSenha && !d.senha) ctx.addIssue({ code: "custom", path: ["senha"], message: "Informe a senha" });
    if (d.tipoSenha === "PADRAO" && d.senha && !/^[1-9]{4,9}$/.test(d.senha)) {
      ctx.addIssue({ code: "custom", path: ["senha"], message: "Use a sequência de pontos de 1 a 9 (ex.: 14789)" });
    }
  });

export const itemOSSchema = z.object({
  tipo: z.enum(["SERVICO", "PECA"]),
  descricao: z.string().trim().min(2, "Descreva o item"),
  quantidade: z.coerce.number().int().min(1),
  valorUnit: z
    .string()
    .transform((v) => Number(v.replace(/\./g, "").replace(",", ".")))
    .refine((v) => Number.isFinite(v) && v >= 0, "Valor inválido"),
});

export function formatarMoeda(valor: number | string | { toString(): string }): string {
  return Number(valor.toString()).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
