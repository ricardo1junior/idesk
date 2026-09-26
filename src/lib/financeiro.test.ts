import { strict as assert } from "node:assert";
import { test } from "node:test";
import { intervaloDoPeriodo, parcelarPagamento } from "./financeiro";

const data = new Date(2026, 8, 26, 15, 0);

test("à vista entra pago na hora", () => {
  const p = parcelarPagamento("PIX", 100, 1, data);
  assert.equal(p.length, 1);
  assert.equal(p[0].pago, true);
});

test("crédito em 3x: parcelas a cada 30 dias, centavos na última", () => {
  const p = parcelarPagamento("CREDITO", 100, 3, data);
  assert.deepEqual(p.map((x) => x.valor), [33.33, 33.33, 33.34]);
  assert.equal(p.every((x) => !x.pago), true);
  assert.equal(Math.round((p[1].vencimento.getTime() - data.getTime()) / 86_400_000), 60);
  assert.equal(p[2].parcela, 3);
});

test("troca não gera dinheiro", () => {
  assert.equal(parcelarPagamento("TROCA", 1800, 1, data).length, 0);
});

test("períodos", () => {
  const mes = intervaloDoPeriodo("mes", undefined, undefined, data);
  assert.equal(mes.inicio.getDate(), 1);
  assert.equal(mes.fim.getMonth(), 9);
  const p = intervaloDoPeriodo("personalizado", "2026-09-01", "2026-09-10", data);
  assert.equal(p.fim.getDate(), 11);
});
