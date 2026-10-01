import assert from "node:assert/strict";
import { test } from "node:test";
import { diasRestantes, planejarDiarias, situacaoDoSaldo } from "./carteira-regras";

const base = { diaria: 3.3, diasTolerancia: 3 };

test("cobra cada dia desde o último cobrado até hoje", () => {
  assert.deepEqual(planejarDiarias({ ...base, ultimoDia: "2026-09-28", hoje: "2026-10-01", saldo: 100 }), ["2026-09-29", "2026-09-30", "2026-10-01"]);
  assert.deepEqual(planejarDiarias({ ...base, ultimoDia: "2026-10-01", hoje: "2026-10-01", saldo: 100 }), []);
});

test("para de cobrar ao chegar no limite da tolerância", () => {
  // saldo 3,30: cobra 1 dia (0), mais 3 de tolerância (-9,90) e para
  const dias = planejarDiarias({ ...base, ultimoDia: "2026-09-01", hoje: "2026-09-30", saldo: 3.3 });
  assert.equal(dias.length, 4);
});

test("situação conforme o saldo", () => {
  const paga = { ...base, isenta: false, diariaDeHojePaga: true };
  assert.equal(situacaoDoSaldo({ ...paga, isenta: true, saldo: -50, diariaDeHojePaga: false }), "ISENTA");
  assert.equal(situacaoDoSaldo({ ...paga, saldo: 0 }), "ATIVA");
  assert.equal(situacaoDoSaldo({ ...paga, saldo: -3.3 }), "TOLERANCIA");
  // último dia de tolerância: já pagou a diária, então ainda usa
  assert.equal(situacaoDoSaldo({ ...paga, saldo: -9.9 }), "TOLERANCIA");
  assert.equal(situacaoDoSaldo({ ...paga, saldo: -9.9, diariaDeHojePaga: false }), "CONSULTA");
  assert.equal(situacaoDoSaldo({ ...paga, diaria: 0, saldo: -9.9, diariaDeHojePaga: false }), "ATIVA");
  assert.equal(diasRestantes(10, 3.3), 3);
  assert.equal(diasRestantes(-5, 3.3), 0);
});
