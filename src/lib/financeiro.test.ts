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

test("períodos seguem o dia de Brasília, não o do servidor", () => {
  // 01/10 às 01:00 UTC ainda é 30/09 em Brasília.
  const agora = new Date("2026-10-01T01:00:00Z");
  const hoje = intervaloDoPeriodo("hoje", undefined, undefined, agora);
  assert.equal(hoje.inicio.toISOString(), "2026-09-30T03:00:00.000Z");
  assert.equal(hoje.fim.toISOString(), "2026-10-01T03:00:00.000Z");
  const mes = intervaloDoPeriodo("mes", undefined, undefined, agora);
  assert.equal(mes.inicio.toISOString(), "2026-09-01T03:00:00.000Z");
  assert.equal(mes.fim.toISOString(), "2026-10-01T03:00:00.000Z");
  const anterior = intervaloDoPeriodo("mes_anterior", undefined, undefined, new Date("2026-01-15T15:00:00Z"));
  assert.equal(anterior.inicio.toISOString(), "2025-12-01T03:00:00.000Z");
  assert.equal(anterior.fim.toISOString(), "2026-01-01T03:00:00.000Z");
  const p = intervaloDoPeriodo("personalizado", "2026-09-01", "2026-09-10", agora);
  assert.equal(p.inicio.toISOString(), "2026-09-01T03:00:00.000Z");
  assert.equal(p.fim.toISOString(), "2026-09-11T03:00:00.000Z");
});

test("parcelas mensais a partir do dia 31 não pulam fevereiro", () => {
  const ymd = (p: { vencimento: Date }[]) => p.map((x) => x.vencimento.toISOString().slice(0, 10));
  assert.deepEqual(ymd(parcelarPagamento("BOLETO", 300, 3, data, "2026-01-31")), ["2026-01-31", "2026-02-28", "2026-03-31"]);
  assert.deepEqual(ymd(parcelarPagamento("A_PRAZO", 300, 2, data, "2028-01-31")), ["2028-01-31", "2028-02-29"]);
  // Sem 1º vencimento: um mês depois da venda (31/01 em Brasília).
  assert.deepEqual(ymd(parcelarPagamento("A_PRAZO", 200, 2, new Date("2026-01-31T20:00:00-03:00"))), ["2026-02-28", "2026-03-31"]);
});

test("transferência entra no caixa na hora", () => {
  const p = parcelarPagamento("TRANSFERENCIA", 250, 1, new Date("2026-09-26T15:00:00-03:00"));
  assert.equal(p.length, 1);
  assert.equal(p[0].pago, true);
});

test("boleto usa o 1º vencimento escolhido e segue mês a mês", () => {
  const p = parcelarPagamento("BOLETO", 300, 3, new Date("2026-09-26T15:00:00-03:00"), "2026-10-10");
  assert.deepEqual(
    p.map((x) => x.vencimento.toISOString().slice(0, 10)),
    ["2026-10-10", "2026-11-10", "2026-12-10"],
  );
  assert.ok(p.every((x) => !x.pago));
});
