import { strict as assert } from "node:assert";
import { test } from "node:test";
import { prepararExtras } from "./clientes";

test("contatos e endereços adicionais", () => {
  const r = prepararExtras(
    JSON.stringify({
      contatos: [
        { tipo: "TELEFONE", valor: "(11) 98888-7777", rotulo: "Trabalho", whatsapp: true },
        { tipo: "EMAIL", valor: "Maria@Empresa.com", rotulo: "", whatsapp: true },
        { tipo: "TELEFONE", valor: "", rotulo: "vazio", whatsapp: false },
      ],
      enderecos: [
        { rotulo: "Entrega", cep: "01310-100", logradouro: "Av. Paulista", numero: "1000", complemento: "", bairro: "", cidade: "São Paulo", uf: "sp" },
        { rotulo: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" },
      ],
    }),
  );
  assert.deepEqual(r.erros, {});
  assert.deepEqual(r.contatos, [
    { tipo: "TELEFONE", valor: "11988887777", rotulo: "Trabalho", whatsapp: true, ordem: 0 },
    { tipo: "EMAIL", valor: "maria@empresa.com", rotulo: null, whatsapp: false, ordem: 1 },
  ]);
  assert.equal(r.enderecos.length, 1);
  assert.equal(r.enderecos[0].cep, "01310100");
  assert.equal(r.enderecos[0].uf, "SP");
  assert.equal(r.enderecos[0].complemento, null);
});

test("e-mail adicional inválido aponta a linha", () => {
  const r = prepararExtras(JSON.stringify({ contatos: [{ tipo: "EMAIL", valor: "x@", rotulo: "", whatsapp: false }], enderecos: [] }));
  assert.equal(r.erros.contato0, "E-mail inválido");
});
