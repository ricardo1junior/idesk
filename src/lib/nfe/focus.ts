import "server-only";
import type { AmbienteFiscal, ModeloNota } from "@prisma/client";
import { descriptografar } from "@/lib/cripto";
import { prisma } from "@/lib/db";
import { interpretar, type RespostaNota } from "./focus-interpretar";

export type { RespostaNota };

// Cliente da API da Focus NFe (https://focusnfe.com.br/doc/). Autenticação: token como usuário, senha vazia.
// Homologação e produção usam endereços (e normalmente tokens) diferentes.

export function urlBase(ambiente: AmbienteFiscal) {
  if (process.env.FOCUSNFE_API_URL) return process.env.FOCUSNFE_API_URL.replace(/\/$/, "");
  return ambiente === "PRODUCAO" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
}

// Os caminhos de DANFE e XML vêm relativos ao endereço da API.
export function linkFocus(ambiente: AmbienteFiscal, caminho: string | null) {
  if (!caminho) return null;
  return /^https?:/.test(caminho) ? caminho : `${urlBase(ambiente)}${caminho}`;
}

// Token da própria loja (Configuração fiscal); sem ele, o do servidor.
async function token(ambiente: AmbienteFiscal) {
  const empresa = await prisma.empresaFiscal.findFirst({ select: { focusTokenHomologacao: true, focusTokenProducao: true } });
  const daLoja = ambiente === "PRODUCAO" ? empresa?.focusTokenProducao : empresa?.focusTokenHomologacao;
  if (daLoja) return descriptografar(daLoja);
  return (ambiente === "PRODUCAO" ? process.env.FOCUSNFE_TOKEN_PRODUCAO : process.env.FOCUSNFE_TOKEN_HOMOLOGACAO) || process.env.FOCUSNFE_TOKEN || null;
}

export async function focusConfigurado(ambiente: AmbienteFiscal) {
  return !!(await token(ambiente));
}

// A nota pode ter chegado à Focus mesmo sem resposta: não tratar como erro definitivo.
export const SEM_RESPOSTA = "Sem resposta da Focus NFe. Tente atualizar a situação em instantes.";

const caminho = (modelo: ModeloNota) => (modelo === "NFCE" ? "nfce" : "nfe");

async function chamar(ambiente: AmbienteFiscal, metodo: string, rota: string, corpo?: unknown): Promise<RespostaNota> {
  const t = await token(ambiente);
  if (!t) return { status: "ERRO", mensagem: "Emissão não configurada: informe o token da Focus NFe em Notas fiscais > Configuração." };
  let resp: Response;
  try {
    resp = await fetch(`${urlBase(ambiente)}${rota}`, {
      method: metodo,
      headers: { Authorization: `Basic ${Buffer.from(`${t}:`).toString("base64")}`, "Content-Type": "application/json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return { status: "ERRO", mensagem: SEM_RESPOSTA };
  }
  const json = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  return interpretar(resp.status, json);
}

export const enviarNota = (ambiente: AmbienteFiscal, modelo: ModeloNota, ref: string, dados: unknown) =>
  chamar(ambiente, "POST", `/v2/${caminho(modelo)}?ref=${encodeURIComponent(ref)}`, dados);

export const consultarNota = (ambiente: AmbienteFiscal, modelo: ModeloNota, ref: string) =>
  chamar(ambiente, "GET", `/v2/${caminho(modelo)}/${encodeURIComponent(ref)}`);

export const cancelarNotaFocus = (ambiente: AmbienteFiscal, modelo: ModeloNota, ref: string, justificativa: string) =>
  chamar(ambiente, "DELETE", `/v2/${caminho(modelo)}/${encodeURIComponent(ref)}`, { justificativa });
