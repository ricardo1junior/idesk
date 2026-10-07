import type { StatusOS, TipoSenha } from "@prisma/client";
import { z } from "zod";
import { imeiValido } from "./mascaras";
import { paraNumero } from "./estoque";
import { ymdValido } from "./tempo";

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
    imei: opcional.refine((v) => !v || imeiValido(v), "IMEI inválido: confira os 15 dígitos"),
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
    previsaoEntrega: opcional.refine((v) => !v || ymdValido(v), "Data inválida"),
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
    .unknown()
    .transform(paraNumero)
    .refine((v) => Number.isFinite(v) && v >= 0, "Valor inválido"),
});

// Para onde cada status pode ir. Antes da entrega o fluxo é livre (pode voltar etapas).
// Cancelada é final; entregue só volta para concluída (desfazer entrega marcada por engano).
// Retorno do cliente depois da entrega vira uma OS nova (garantia).
const TODOS_STATUS: StatusOS[] = ["ABERTA", "EM_ANALISE", "ORCAMENTO_ENVIADO", "APROVADA", "EM_EXECUCAO", "CONCLUIDA", "ENTREGUE", "CANCELADA"];
export const TRANSICOES_OS: Record<StatusOS, StatusOS[]> = {
  ABERTA: TODOS_STATUS,
  EM_ANALISE: TODOS_STATUS,
  ORCAMENTO_ENVIADO: TODOS_STATUS,
  APROVADA: TODOS_STATUS,
  EM_EXECUCAO: TODOS_STATUS,
  CONCLUIDA: TODOS_STATUS,
  ENTREGUE: ["ENTREGUE", "CONCLUIDA"],
  CANCELADA: ["CANCELADA"],
};

export const statusOSValido = (v: unknown): v is StatusOS => typeof v === "string" && Object.hasOwn(STATUS_OS, v);
export const podeMudarStatusOS = (de: StatusOS, para: StatusOS) => TRANSICOES_OS[de].includes(para);
/** Orçamento (itens e desconto) não muda depois de entregue ou cancelada. */
export const orcamentoTravado = (s: StatusOS) => s === "ENTREGUE" || s === "CANCELADA";

// Situação do pagamento: recebido (PAGO), a receber (PENDENTE) e o que ainda falta lançar.
export function resumoPagamentoOS(total: number, lancamentos: { status: string; valor: number | { toString(): string } }[]) {
  const centavos = (v: number | { toString(): string }) => Math.round(Number(v.toString()) * 100);
  let recebido = 0;
  let aReceber = 0;
  for (const l of lancamentos) {
    if (l.status === "PAGO") recebido += centavos(l.valor);
    else if (l.status === "PENDENTE") aReceber += centavos(l.valor);
  }
  const t = centavos(total);
  return {
    recebido: recebido / 100,
    aReceber: aReceber / 100,
    faltaLancar: Math.max(0, t - recebido - aReceber) / 100,
    quitada: t > 0 && recebido >= t,
  };
}

export function formatarMoeda(valor: number | string | { toString(): string }): string {
  return Number(valor.toString()).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
