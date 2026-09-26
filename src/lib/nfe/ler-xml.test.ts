import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { lerXmlNFe } from "./ler-xml";

const xml = readFileSync(join(process.cwd(), "src/lib/nfe/__exemplos__/nfe-fornecedor.xml"), "utf8");

test("lê cabeçalho, emitente, itens e duplicatas", () => {
  const n = lerXmlNFe(xml);
  assert.equal(n.chave, "35260912345678000195550010000012341000012345");
  assert.equal(n.numero, "1234");
  assert.equal(n.emitente.cnpj, "12345678000195");
  assert.equal(n.itens.length, 2);
  assert.equal(n.itens[0].ean, "7891234567890");
  assert.equal(n.itens[0].custoUnitario, 305); // (600 + 20 - 10) / 2
  assert.equal(n.itens[1].ean, null); // SEM GTIN
  assert.deepEqual(n.itens[1].imeis, ["356111111111119", "356222222222228"]);
  assert.equal(n.duplicatas.length, 2);
  assert.equal(n.valorTotal, 9010);
});

test("rejeita arquivo que não é NF-e", () => {
  assert.throws(() => lerXmlNFe("<nada/>"), /não é o XML de uma NF-e/);
});
