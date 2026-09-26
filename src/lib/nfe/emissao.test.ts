/* eslint-disable @typescript-eslint/no-explicit-any -- inspeção do JSON montado */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ErroNota, montarNota, ratearDesconto, type EmpresaParaNota, type VendaParaNota } from "./emissao";
import { interpretar } from "./focus-interpretar";

const empresa: EmpresaParaNota = {
  cnpj: "11.222.333/0001-81",
  uf: "SP",
  regime: "SIMPLES_NACIONAL",
  icmsSituacao: "102",
  icmsAliquota: 0,
  pisCofinsCst: "07",
  cfopDentroEstado: "5102",
  cfopForaEstado: "6102",
  origemPadrao: "0",
  naturezaOperacao: "Venda de mercadoria",
  informacoesFisco: null,
};

const cliente = {
  tipo: "PF" as const,
  nome: "Maria Souza",
  documento: "529.982.247-25",
  inscricaoEstadual: null,
  email: "maria@exemplo.com",
  telefone: "11999998888",
  cep: "01310-100",
  logradouro: "Av. Paulista",
  numero: "1000",
  complemento: null,
  bairro: "Bela Vista",
  cidade: "São Paulo",
  uf: "SP",
};

const venda: VendaParaNota = {
  numero: 7,
  criadoEm: new Date(),
  desconto: 10,
  cliente,
  itens: [
    { codigo: "IP15", descricao: "iPhone 15 128GB", ncm: "85171300", ean: null, unidade: "UN", quantidade: 1, valorUnit: 5000, desconto: 100, imei: "356789012345678", serial: null },
    { codigo: "CAP", descricao: "Capa", ncm: "42029200", ean: "7891234567895", unidade: "UN", quantidade: 2, valorUnit: 50, desconto: 0, imei: null, serial: null },
  ],
  pagamentos: [
    { forma: "PIX", valor: 4000 },
    { forma: "CREDITO", valor: 990 },
  ],
};

test("rateio do desconto fecha no centavo", () => {
  const partes = ratearDesconto([10, 10, 10], 1);
  assert.equal(Math.round(partes.reduce((a, b) => a + b, 0) * 100), 100);
  assert.deepEqual(ratearDesconto([10, 0], 0), [0, 0]);
});

test("NF-e dentro do estado com Simples Nacional", () => {
  const n = montarNota("NFE", empresa, venda) as Record<string, any>;
  assert.equal(n.local_destino, 1);
  assert.equal(n.cnpj_emitente, "11222333000181");
  assert.equal(n.cpf_destinatario, "52998224725");
  assert.equal(n.indicador_inscricao_estadual_destinatario, 9);
  assert.equal(n.items[0].cfop, "5102");
  assert.equal(n.items[0].icms_situacao_tributaria, "102");
  assert.equal(n.items[0].informacoes_adicionais_item, "IMEI 356789012345678");
  assert.equal(n.items[1].codigo_barras_comercial, "7891234567895");
  assert.equal(n.valor_produtos, 5100);
  assert.equal(n.valor_desconto, 110);
  assert.equal(n.valor_total, 4990);
  assert.equal(n.formas_pagamento[0].forma_pagamento, "17");
  assert.equal(n.formas_pagamento[1].tipo_integracao, 2);
  assert.match(n.informacoes_adicionais_contribuinte, /Simples Nacional/);
});

test("NF-e para outro estado usa CFOP interestadual", () => {
  const n = montarNota("NFE", empresa, { ...venda, cliente: { ...cliente, uf: "RJ" } }) as Record<string, any>;
  assert.equal(n.local_destino, 2);
  assert.equal(n.items[0].cfop, "6102");
});

test("NF-e exige cliente com endereço e produtos com NCM", () => {
  assert.throws(() => montarNota("NFE", empresa, { ...venda, cliente: null }), ErroNota);
  assert.throws(() => montarNota("NFE", empresa, { ...venda, cliente: { ...cliente, cep: null } }), /CEP do cliente/);
  assert.throws(() => montarNota("NFCE", empresa, { ...venda, itens: [{ ...venda.itens[0], ncm: null }] }), /NCM/);
});

test("NFC-e aceita consumidor sem identificação", () => {
  const n = montarNota("NFCE", empresa, { ...venda, cliente: null }) as Record<string, any>;
  assert.equal(n.cpf_destinatario, undefined);
  assert.equal(n.local_destino, undefined);
  assert.equal(n.consumidor_final, 1);
});

test("resposta da Focus", () => {
  assert.equal(interpretar(200, { status: "autorizado", numero: "12", chave_nfe: "NFe3526" }).chave, "3526");
  assert.equal(interpretar(200, { status: "erro_autorizacao", mensagem_sefaz: "Rejeição" }).status, "REJEITADA");
  assert.equal(interpretar(422, { codigo: "requisicao_invalida", mensagem: "CNPJ inválido" }).mensagem, "CNPJ inválido");
});
