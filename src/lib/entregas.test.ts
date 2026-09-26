import assert from "node:assert/strict";
import { test } from "node:test";
import { enderecoEmLinha, formatarDuracao, tempoTotal } from "./entregas";

test("endereço em uma linha", () => {
  assert.equal(
    enderecoEmLinha({ logradouro: "Av. Paulista", numero: "1000", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP", cep: "01310100" }),
    "Av. Paulista, 1000, Bela Vista, São Paulo - SP, 01310-100",
  );
  assert.equal(enderecoEmLinha({ cidade: "Santos", uf: "SP" }), "Santos - SP");
});

test("tempo de ida e volta", () => {
  assert.equal(tempoTotal(18, 10), 50); // 18+10+18=46 → 50
  assert.equal(formatarDuracao(50), "50 min");
  assert.equal(formatarDuracao(95), "1h35");
  assert.equal(formatarDuracao(120), "2h");
});
