import "server-only";
import type { AmbienteFiscal, ModeloNota } from "@prisma/client";
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

function token(ambiente: AmbienteFiscal) {
  return (ambiente === "PRODUCAO" ? process.env.FOCUSNFE_TOKEN_PRODUCAO : process.env.FOCUSNFE_TOKEN_HOMOLOGACAO) || process.env.FOCUSNFE_TOKEN || null;
}

export function focusConfigurado(ambiente: AmbienteFiscal) {
  return !!token(ambiente);
}

const caminho = (modelo: ModeloNota) => (modelo === "NFCE" ? "nfce" : "nfe");

async function chamar(ambiente: AmbienteFiscal, metodo: string, rota: string, corpo?: unknown): Promise<RespostaNota> {
  const t = token(ambiente);
  if (!t) return { status: "ERRO", mensagem: "Emissão não configurada: defina FOCUSNFE_TOKEN no servidor." };
  let resp: Response;
  try {
    resp = await fetch(`${urlBase(ambiente)}${rota}`, {
      method: metodo,
      headers: { Authorization: `Basic ${Buffer.from(`${t}:`).toString("base64")}`, "Content-Type": "application/json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return { status: "ERRO", mensagem: "Sem resposta da Focus NFe. Tente atualizar a situação em instantes." };
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
