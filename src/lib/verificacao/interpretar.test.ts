import { strict as assert } from "node:assert";
import { test } from "node:test";
import { interpretarAnatel, interpretarImeiOrg } from "./interpretar";

test("Anatel", () => {
  assert.equal(interpretarAnatel({ code: 200, data: [{ resultado: "IMEI não consta como impedido" }] }).situacao, "OK");
  assert.equal(interpretarAnatel({ code: 200, data: [{ resultado: "Aparelho com registro de ROUBO/FURTO" }] }).situacao, "RESTRICAO");
  assert.equal(interpretarAnatel({ code: 200, data: [{ resultado: "Aparelho irregular" }] }).situacao, "RESTRICAO");
  assert.equal(interpretarAnatel({ code: 200, data: [{ resultado: "Consulte a operadora" }] }).situacao, "ALERTA");
  assert.equal(interpretarAnatel({ code: 601, code_message: "Token inválido" }).situacao, "ERRO");
});

test("IMEI.org", () => {
  const limpo = interpretarImeiOrg({
    status: 1,
    response: { services: [{ Model: "IPHONE 13 128GB", "FMI": "OFF", "GSMA Blacklist": "CLEAN", Simlock: "UNLOCKED", "Warranty Status": "Out Of Warranty" }] },
  });
  assert.equal(limpo.situacao, "OK");
  assert.match(limpo.resumo, /Garantia Apple: Out Of Warranty/);

  assert.equal(interpretarImeiOrg({ status: 1, response: { services: [{ Model: "IPHONE X", iCloud: "LOST / ERASED", Simlock: "UNLOCKED" }] } }).situacao, "RESTRICAO");
  assert.equal(interpretarImeiOrg({ status: 1, response: { services: [{ FMI: "ON" }] } }).situacao, "RESTRICAO");
  assert.equal(interpretarImeiOrg({ status: 1, response: { services: [{ FMI: "OFF", Blacklist: "BLACKLISTED" }] } }).situacao, "RESTRICAO");
  assert.equal(interpretarImeiOrg({ status: 1, response: { services: [{ Model: "IPHONE 12" }] } }).situacao, "ALERTA");
  assert.equal(interpretarImeiOrg({ status: 0, response: "Invalid API key" }).situacao, "ERRO");
});
