import { XMLParser } from "fast-xml-parser";

// Leitura do XML de NF-e (modelo 55) recebida de fornecedor.

export type ItemNota = {
  numero: number;
  codigo: string;
  ean: string | null;
  descricao: string;
  ncm: string | null;
  cfop: string | null;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  custoUnitario: number; // já com frete, seguro, IPI, outras despesas e desconto do item
  informacoes: string | null;
  imeis: string[];
};

export type NotaLida = {
  chave: string;
  numero: string;
  serie: string;
  emissao: Date;
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string | null;
    ie: string | null;
    telefone: string | null;
    cidade: string | null;
    uf: string | null;
  };
  destinatarioDocumento: string | null;
  itens: ItemNota[];
  valorTotal: number;
  duplicatas: { numero: string; vencimento: Date; valor: number }[];
};

type No = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false, // mantém zeros à esquerda (códigos, CNPJ, EAN)
  isArray: (nome) => nome === "det" || nome === "dup",
});

const num = (v: unknown) => (v == null || v === "" ? 0 : Number(v));
const txt = (v: unknown) => (v == null || v === "" ? null : String(v).trim());
const no = (v: unknown): No => (v && typeof v === "object" ? (v as No) : {});

export class ErroXml extends Error {}

// IMEIs costumam vir no texto adicional do item (infAdProd).
export function extrairImeis(texto: string | null): string[] {
  if (!texto) return [];
  return [...new Set(texto.match(/(?<!\d)\d{15}(?!\d)/g) ?? [])];
}

export function lerXmlNFe(xml: string): NotaLida {
  let doc: No;
  // NF-e nunca tem DOCTYPE; recusar evita XML com entidades montadas para travar o servidor.
  if (/<!DOCTYPE/i.test(xml)) throw new ErroXml("Arquivo não é o XML de uma NF-e.");
  try {
    doc = parser.parse(xml);
  } catch {
    throw new ErroXml("Arquivo não é um XML válido.");
  }
  const proc = no(doc.nfeProc);
  const nfe = no(proc.NFe ?? doc.NFe);
  const inf = no(nfe.infNFe);
  if (!Object.keys(inf).length) throw new ErroXml("O arquivo não é o XML de uma NF-e.");
  const ide = no(inf.ide);
  if (String(ide.mod) !== "55") throw new ErroXml("Só é possível importar NF-e (modelo 55).");

  const chave =
    String(inf["@Id"] ?? "").replace(/^NFe/, "") || String(no(no(proc.protNFe).infProt).chNFe ?? "");
  if (!/^\d{44}$/.test(chave)) throw new ErroXml("Chave de acesso não encontrada no XML.");

  const emit = no(inf.emit);
  const ender = no(emit.enderEmit);
  const itens: ItemNota[] = ((inf.det as unknown[]) ?? []).map((d) => {
    const det = no(d);
    const p = no(det.prod);
    const quantidade = num(p.qCom);
    const vIPI = num(no(no(no(det.imposto).IPI).IPITrib).vIPI);
    const bruto = num(p.vProd) + num(p.vFrete) + num(p.vSeg) + num(p.vOutro) + vIPI - num(p.vDesc);
    const informacoes = txt(det.infAdProd);
    const ean = txt(p.cEAN);
    return {
      numero: Number(det["@nItem"] ?? 0),
      codigo: String(p.cProd ?? ""),
      ean: ean && /^\d{8,14}$/.test(ean) ? ean : null,
      descricao: String(p.xProd ?? "").trim(),
      ncm: txt(p.NCM),
      cfop: txt(p.CFOP),
      unidade: String(p.uCom ?? "UN").toUpperCase(),
      quantidade,
      valorUnitario: num(p.vUnCom),
      valorTotal: num(p.vProd),
      custoUnitario: quantidade ? Math.round((bruto / quantidade) * 100) / 100 : 0,
      informacoes,
      imeis: extrairImeis(informacoes),
    };
  });
  if (!itens.length) throw new ErroXml("A nota não tem itens.");

  const dups = (no(inf.cobr).dup as unknown[]) ?? [];
  return {
    chave,
    numero: String(ide.nNF ?? ""),
    serie: String(ide.serie ?? ""),
    emissao: new Date(String(ide.dhEmi ?? ide.dEmi ?? new Date().toISOString())),
    emitente: {
      cnpj: String(emit.CNPJ ?? emit.CPF ?? ""),
      razaoSocial: String(emit.xNome ?? "").trim(),
      nomeFantasia: txt(emit.xFant),
      ie: txt(emit.IE),
      telefone: txt(ender.fone),
      cidade: txt(ender.xMun),
      uf: txt(ender.UF),
    },
    destinatarioDocumento: txt(no(inf.dest).CNPJ ?? no(inf.dest).CPF),
    itens,
    valorTotal: num(no(no(inf.total).ICMSTot).vNF),
    // Parcela sem data de vencimento válida é ignorada (não vira conta a pagar com data inválida).
    duplicatas: dups
      .map((x) => no(x))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d.dVenc ?? "")))
      .map((d) => ({ numero: String(d.nDup ?? ""), vencimento: new Date(`${d.dVenc}T12:00:00-03:00`), valor: num(d.vDup) })),
  };
}
