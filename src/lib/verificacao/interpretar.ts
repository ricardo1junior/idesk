import type { SituacaoVerificacao } from "@prisma/client";

// Interpretação das respostas dos serviços de consulta de IMEI.
// Os textos variam entre serviços e mudam com o tempo, então a leitura é tolerante:
// o que indica restrição vira RESTRICAO, o que indica "limpo" vira OK e o resto vira ALERTA
// para o atendente conferir a resposta completa.

export type Resultado = { situacao: SituacaoVerificacao; resumo: string };

const normalizar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Anatel / Celular Legal (via Infosimples): campo "resultado" em texto livre.
export function interpretarAnatel(resposta: unknown): Resultado {
  const r = resposta as { code?: number; code_message?: string; data?: { resultado?: string }[] };
  if (r?.code !== 200) return { situacao: "ERRO", resumo: `Anatel: ${r?.code_message ?? "sem resposta"} (código ${r?.code ?? "-"})` };
  const texto = r.data?.[0]?.resultado ?? "";
  const t = normalizar(texto);
  const negativa = /(nao (consta|ha|possui)|sem restric|\bregular\b)/;
  if (/(roubo|roubad|furto|furtad|extravi|irregular|imped|bloquead|restric)/.test(t) && !negativa.test(t)) {
    return { situacao: "RESTRICAO", resumo: `Anatel: ${texto}` };
  }
  if (negativa.test(t)) return { situacao: "OK", resumo: `Anatel: ${texto || "sem restrição"}` };
  return { situacao: "ALERTA", resumo: `Anatel: ${texto || "resposta sem resultado"}` };
}

// IMEI.org: objeto com chaves variadas por serviço (iCloud, FMI, Blacklist, Warranty...).
export function interpretarImeiOrg(resposta: unknown): Resultado {
  const r = resposta as { status?: number; response?: unknown; error?: string; message?: string };
  if (r?.status !== 1) {
    const msg = r?.error ?? r?.message ?? (typeof r?.response === "string" ? r.response : "sem resposta");
    return { situacao: "ERRO", resumo: `IMEI.org: ${msg}` };
  }
  const resp = r.response as { services?: Record<string, unknown>[] } | Record<string, unknown>;
  const campos: Record<string, string> = {};
  const origem = (Array.isArray((resp as { services?: unknown[] }).services) ? (resp as { services: Record<string, unknown>[] }).services[0] : resp) ?? {};
  for (const [k, v] of Object.entries(origem)) if (typeof v === "string" || typeof v === "number") campos[normalizar(k)] = String(v);

  const achar = (...chaves: string[]) => Object.entries(campos).find(([k]) => chaves.some((c) => k.includes(c)))?.[1];
  const problemas: string[] = [];
  const info: string[] = [];

  const fmi = achar("fmi", "find my");
  const icloud = achar("icloud");
  if (fmi && /\bon\b/i.test(fmi)) problemas.push("Buscar iPhone ATIVO");
  if (icloud && /(lost|perdid|\bon\b|locked)/i.test(icloud)) problemas.push(`iCloud: ${icloud}`);
  if (fmi && /\boff\b/i.test(fmi)) info.push("Buscar iPhone desativado");

  const blacklist = achar("blacklist", "gsma", "blocked");
  if (blacklist) {
    if (/(black|block|lost|stolen|yes|sim)/i.test(blacklist) && !/(clean|limpo|\bno\b|not)/i.test(blacklist)) problemas.push(`Blacklist: ${blacklist}`);
    else info.push(`Blacklist: ${blacklist}`);
  }
  const simlock = achar("simlock", "sim-lock", "carrier lock");
  if (simlock) info.push(`Operadora: ${simlock}`);
  const garantia = achar("warranty", "coverage", "garantia");
  if (garantia) info.push(`Garantia Apple: ${garantia}`);
  const modelo = achar("model");
  if (modelo) info.unshift(modelo);

  if (problemas.length) return { situacao: "RESTRICAO", resumo: `IMEI.org: ${[...problemas, ...info].join(" · ")}` };
  if (!fmi && !icloud && !blacklist) return { situacao: "ALERTA", resumo: `IMEI.org: resposta sem iCloud/blacklist. ${info.join(" · ")}`.trim() };
  return { situacao: "OK", resumo: `IMEI.org: ${info.join(" · ") || "sem restrição"}` };
}
