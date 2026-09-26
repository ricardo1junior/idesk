import type { FormaPagamento, ModeloNota, RegimeTributario } from "@prisma/client";
import { somenteDigitos } from "@/lib/documentos";

// Monta o JSON de NF-e / NFC-e no formato da API da Focus NFe (v2) a partir de uma venda.
// Os códigos fiscais vêm da configuração da empresa; confirme-os com o contador.

export type EmpresaParaNota = {
  cnpj: string;
  uf: string;
  regime: RegimeTributario;
  icmsSituacao: string;
  icmsAliquota: number;
  pisCofinsCst: string;
  cfopDentroEstado: string;
  cfopForaEstado: string;
  origemPadrao: string;
  naturezaOperacao: string;
  informacoesFisco: string | null;
};

export type VendaParaNota = {
  numero: number;
  criadoEm: Date;
  desconto: number; // desconto geral
  cliente: {
    tipo: "PF" | "PJ";
    nome: string;
    documento: string;
    inscricaoEstadual: string | null;
    email: string | null;
    telefone: string | null;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
  } | null;
  itens: {
    codigo: string;
    descricao: string;
    ncm: string | null;
    ean: string | null;
    unidade: string;
    quantidade: number;
    valorUnit: number;
    desconto: number; // desconto do item em R$
    imei: string | null;
    serial: string | null;
  }[];
  pagamentos: { forma: FormaPagamento; valor: number }[];
};

export class ErroNota extends Error {}

const CODIGO_PAGAMENTO: Record<FormaPagamento, string> = {
  DINHEIRO: "01",
  CREDITO: "03",
  DEBITO: "04",
  A_PRAZO: "05", // crédito loja
  BOLETO: "15",
  PIX: "17",
  TROCA: "99",
};

const CRT: Record<RegimeTributario, string> = { SIMPLES_NACIONAL: "1", SIMPLES_EXCESSO: "2", NORMAL: "3", MEI: "4" };

const TEXTO_SIMPLES = "Documento emitido por ME ou EPP optante pelo Simples Nacional. Não gera direito a crédito fiscal de IPI.";

const c = (v: number) => Math.round(v * 100);
const r = (centavos: number) => centavos / 100;

// Divide o desconto geral entre os itens na proporção do valor de cada um (sobra de centavos no último).
export function ratearDesconto(valores: number[], desconto: number): number[] {
  const totais = valores.map(c);
  const soma = totais.reduce((a, b) => a + b, 0);
  const alvo = c(desconto);
  if (soma === 0 || alvo === 0) return valores.map(() => 0);
  const partes = totais.map((t) => Math.floor((t * alvo) / soma));
  partes[partes.length - 1] += alvo - partes.reduce((a, b) => a + b, 0);
  return partes.map(r);
}

export function montarNota(modelo: ModeloNota, empresa: EmpresaParaNota, venda: VendaParaNota, agora = new Date()) {
  const faltando: string[] = [];
  const cli = venda.cliente;
  if (!venda.itens.length) throw new ErroNota("A venda não tem itens.");
  venda.itens.forEach((i) => {
    if (!i.ncm || somenteDigitos(i.ncm).length !== 8) faltando.push(`NCM do produto "${i.descricao}" (cadastre no estoque)`);
  });

  const ufCliente = cli?.uf?.toUpperCase() ?? null;
  const foraDoEstado = modelo === "NFE" && !!ufCliente && ufCliente !== empresa.uf.toUpperCase();

  if (modelo === "NFE") {
    if (!cli) faltando.push("cliente (a NF-e exige destinatário identificado)");
    else {
      for (const [campo, nome] of [
        ["logradouro", "endereço"],
        ["numero", "número do endereço"],
        ["bairro", "bairro"],
        ["cidade", "cidade"],
        ["uf", "UF"],
        ["cep", "CEP"],
      ] as const) {
        if (!cli[campo]) faltando.push(`${nome} do cliente`);
      }
    }
  }
  if (faltando.length) throw new ErroNota(`Para emitir, preencha: ${faltando.join("; ")}.`);

  const brutos = venda.itens.map((i) => r(c(i.valorUnit) * i.quantidade));
  const liquidosAntesRateio = venda.itens.map((i, k) => r(c(brutos[k]) - c(i.desconto)));
  const rateio = ratearDesconto(liquidosAntesRateio, venda.desconto);
  const cfop = foraDoEstado ? empresa.cfopForaEstado : empresa.cfopDentroEstado;

  const items = venda.itens.map((i, k) => {
    const descontoItem = r(c(i.desconto) + c(rateio[k]));
    const liquido = r(c(brutos[k]) - c(descontoItem));
    const ident = [i.imei && `IMEI ${i.imei}`, i.serial && `Serial ${i.serial}`].filter(Boolean).join(" ");
    const icmsTributado = empresa.regime === "NORMAL" && ["00", "20"].includes(empresa.icmsSituacao);
    return {
      numero_item: k + 1,
      codigo_produto: i.codigo,
      descricao: i.descricao.slice(0, 120),
      cfop,
      codigo_ncm: somenteDigitos(i.ncm!),
      codigo_barras_comercial: i.ean || "SEM GTIN",
      codigo_barras_tributavel: i.ean || "SEM GTIN",
      unidade_comercial: i.unidade,
      quantidade_comercial: i.quantidade,
      valor_unitario_comercial: i.valorUnit,
      unidade_tributavel: i.unidade,
      quantidade_tributavel: i.quantidade,
      valor_unitario_tributavel: i.valorUnit,
      valor_bruto: brutos[k],
      ...(descontoItem > 0 ? { valor_desconto: descontoItem } : {}),
      inclui_no_total: 1,
      icms_origem: empresa.origemPadrao,
      icms_situacao_tributaria: empresa.icmsSituacao,
      ...(icmsTributado
        ? {
            icms_modalidade_base_calculo: 3,
            icms_base_calculo: liquido,
            icms_aliquota: empresa.icmsAliquota,
            icms_valor: r(Math.round(c(liquido) * empresa.icmsAliquota / 100)),
          }
        : {}),
      pis_situacao_tributaria: empresa.pisCofinsCst,
      cofins_situacao_tributaria: empresa.pisCofinsCst,
      ...(ident ? { informacoes_adicionais_item: ident } : {}),
    };
  });

  const valorProdutos = r(brutos.reduce((s, b) => s + c(b), 0));
  const valorDesconto = r(items.reduce((s, i) => s + c(i.valor_desconto ?? 0), 0));
  const valorTotal = r(c(valorProdutos) - c(valorDesconto));

  const pagamentos = venda.pagamentos.length ? venda.pagamentos : [{ forma: "DINHEIRO" as FormaPagamento, valor: valorTotal }];
  const formas_pagamento = pagamentos.map((p) => ({
    forma_pagamento: CODIGO_PAGAMENTO[p.forma],
    valor_pagamento: p.valor,
    ...(p.forma === "CREDITO" || p.forma === "DEBITO" ? { tipo_integracao: 2 } : {}),
    ...(p.forma === "TROCA" ? { descricao_pagamento: "Aparelho usado recebido na troca" } : {}),
  }));

  const informacoes = empresa.informacoesFisco ?? (empresa.regime === "SIMPLES_NACIONAL" || empresa.regime === "MEI" ? TEXTO_SIMPLES : null);

  const destinatario = cli ? destinatarioDe(modelo, cli) : {};
  const contribuinte = cli?.tipo === "PJ" && !!cli.inscricaoEstadual && cli.inscricaoEstadual.toUpperCase() !== "ISENTO";

  return {
    natureza_operacao: empresa.naturezaOperacao,
    data_emissao: agora.toISOString(),
    tipo_documento: 1,
    finalidade_emissao: 1,
    ...(modelo === "NFE" ? { local_destino: foraDoEstado ? 2 : 1 } : {}),
    consumidor_final: modelo === "NFCE" || !contribuinte ? 1 : 0,
    presenca_comprador: 1,
    modalidade_frete: 9,
    cnpj_emitente: somenteDigitos(empresa.cnpj),
    regime_tributario_emitente: CRT[empresa.regime],
    ...destinatario,
    valor_produtos: valorProdutos,
    valor_desconto: valorDesconto,
    valor_total: valorTotal,
    ...(informacoes ? { informacoes_adicionais_contribuinte: `${informacoes} Venda ${venda.numero}.` } : { informacoes_adicionais_contribuinte: `Venda ${venda.numero}.` }),
    items,
    formas_pagamento,
  };
}

function destinatarioDe(modelo: ModeloNota, cli: NonNullable<VendaParaNota["cliente"]>) {
  const doc = somenteDigitos(cli.documento);
  const docCampo = cli.tipo === "PJ" ? { cnpj_destinatario: doc } : { cpf_destinatario: doc };
  if (modelo === "NFCE") return { ...docCampo, nome_destinatario: cli.nome.slice(0, 60) };
  const ie = cli.inscricaoEstadual?.trim();
  const indicador = cli.tipo === "PJ" && ie && ie.toUpperCase() !== "ISENTO" ? 1 : cli.tipo === "PJ" && ie?.toUpperCase() === "ISENTO" ? 2 : 9;
  return {
    ...docCampo,
    nome_destinatario: cli.nome.slice(0, 60),
    indicador_inscricao_estadual_destinatario: indicador,
    ...(indicador === 1 ? { inscricao_estadual_destinatario: somenteDigitos(ie!) } : {}),
    logradouro_destinatario: cli.logradouro,
    numero_destinatario: cli.numero,
    ...(cli.complemento ? { complemento_destinatario: cli.complemento } : {}),
    bairro_destinatario: cli.bairro,
    municipio_destinatario: cli.cidade,
    uf_destinatario: cli.uf?.toUpperCase(),
    cep_destinatario: somenteDigitos(cli.cep ?? ""),
    ...(cli.telefone ? { telefone_destinatario: somenteDigitos(cli.telefone) } : {}),
    ...(cli.email ? { email_destinatario: cli.email } : {}),
  };
}
