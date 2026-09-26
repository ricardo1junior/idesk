import type { StatusNota } from "@prisma/client";

export type RespostaNota = {
  status: StatusNota;
  numero?: string;
  serie?: string;
  chave?: string;
  mensagem?: string;
  caminhoDanfe?: string;
  caminhoXml?: string;
};

export function interpretar(http: number, j: Record<string, unknown>): RespostaNota {
  const s = (v: unknown) => (v == null || v === "" ? undefined : String(v));
  const erros = Array.isArray(j.erros) ? (j.erros as { mensagem?: string }[]).map((e) => e.mensagem).filter(Boolean).join("; ") : "";
  const mensagem = [s(j.mensagem_sefaz) ?? s(j.mensagem), erros].filter(Boolean).join(" · ") || undefined;
  const comum = {
    numero: s(j.numero),
    serie: s(j.serie),
    chave: s(j.chave_nfe)?.replace(/^NFe/, ""),
    caminhoDanfe: s(j.caminho_danfe),
    caminhoXml: s(j.caminho_xml_nota_fiscal),
    mensagem,
  };
  switch (j.status) {
    case "autorizado":
      return { status: "AUTORIZADA", ...comum };
    case "cancelado":
      return { status: "CANCELADA", ...comum };
    case "processando_autorizacao":
      return { status: "PROCESSANDO", ...comum };
    case "erro_autorizacao":
    case "denegado":
      return { status: "REJEITADA", ...comum };
  }
  if (http >= 400) return { status: "ERRO", mensagem: mensagem ?? `Erro ${http} na Focus NFe.` };
  return { status: "PROCESSANDO", ...comum };
}
