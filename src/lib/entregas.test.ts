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

test("formulário de entrega: taxa, dia e hora", async () => {
  const { entregaSchema, TRANSICOES_ENTREGA, statusEntregaValido } = await import("./entregas");
  const base = { tipo: "ENTREGA", clienteId: "c1", endereco: "Rua A, 100, Centro", dia: "", hora: "", vendaId: "", osId: "", taxa: "", distanciaKm: "", minutosIda: "", minutosTotal: "", responsavelId: "", observacoes: "" };
  assert.equal(entregaSchema.parse({ ...base, taxa: "15.50" }).taxa, 15.5);
  assert.equal(entregaSchema.parse({ ...base, taxa: "1.500" }).taxa, 1500);
  assert.equal(entregaSchema.parse(base).taxa, 0);
  assert.equal(entregaSchema.safeParse({ ...base, taxa: "abc" }).success, false);
  assert.equal(entregaSchema.safeParse({ ...base, dia: "2026-13-45", hora: "10:00" }).success, false);
  assert.equal(entregaSchema.safeParse({ ...base, dia: "2026-10-02", hora: "25:00" }).success, false);
  assert.equal(entregaSchema.parse({ ...base, dia: "2026-10-02", hora: "09:30" }).hora, "09:30");
  assert.deepEqual(TRANSICOES_ENTREGA.CONCLUIDA, []);
  assert.ok(TRANSICOES_ENTREGA.PENDENTE.includes("EM_ROTA"));
  assert.equal(statusEntregaValido("constructor"), false);
});
