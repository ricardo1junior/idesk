import "server-only";

import type { FonteVerificacao, Prisma } from "@prisma/client";
import { interpretarAnatel, interpretarImeiOrg, type Resultado } from "./interpretar";

// Clientes dos serviços pagos de consulta de IMEI. As chaves ficam no .env.
// Sem chave configurada, o serviço é pulado e a tela avisa.

export type Consulta = Resultado & { fonte: FonteVerificacao; detalhes: Prisma.InputJsonValue | null };

const TEMPO_LIMITE_MS = 60_000;

export function servicosConfigurados(): FonteVerificacao[] {
  const fontes: FonteVerificacao[] = [];
  if (process.env.INFOSIMPLES_TOKEN) fontes.push("ANATEL");
  if (process.env.IMEIORG_API_KEY) fontes.push("IMEI_ORG");
  return fontes;
}

async function consultarAnatel(imei: string): Promise<Consulta> {
  // Infosimples: https://api.infosimples.com — consulta "Anatel / Celular Legal"
  const corpo = new URLSearchParams({ token: process.env.INFOSIMPLES_TOKEN!, imei, timeout: "300" });
  const url = (process.env.INFOSIMPLES_API_URL || "https://api.infosimples.com/api/v2") + "/consultas/anatel/celular-legal";
  const resp = await fetch(url, {
    method: "POST",
    body: corpo,
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  const json = await resp.json();
  return { fonte: "ANATEL", ...interpretarAnatel(json), detalhes: json };
}

async function consultarImeiOrg(imei: string): Promise<Consulta> {
  // IMEI.org: https://imei.org/api-connect — serviço padrão 171 "Apple Advanced Check"
  const base = process.env.IMEIORG_API_URL || "https://api-client.imei.org/api";
  const params = new URLSearchParams({
    apikey: process.env.IMEIORG_API_KEY!,
    service_id: process.env.IMEIORG_SERVICE_ID || "171",
    input: imei,
  });
  const resp = await fetch(`${base}/submit?${params}`, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
  const json = await resp.json();
  return { fonte: "IMEI_ORG", ...interpretarImeiOrg(json), detalhes: json };
}

const CONSULTAS: Record<FonteVerificacao, (imei: string) => Promise<Consulta>> = {
  ANATEL: consultarAnatel,
  IMEI_ORG: consultarImeiOrg,
};

export async function consultarImei(imei: string): Promise<Consulta[]> {
  return Promise.all(
    servicosConfigurados().map((fonte) =>
      CONSULTAS[fonte](imei).catch(
        (e: unknown): Consulta => ({
          fonte,
          situacao: "ERRO",
          resumo: `${fonte === "ANATEL" ? "Anatel" : "IMEI.org"}: falha na consulta (${e instanceof Error ? e.message : String(e)})`,
          detalhes: null,
        }),
      ),
    ),
  );
}
