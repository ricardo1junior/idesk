import assert from "node:assert/strict";
import { test } from "node:test";
import { faixaDaPagina, hrefPagina, lerPagina } from "./paginacao";

test("página da URL", () => {
  assert.equal(lerPagina(undefined), 1);
  assert.equal(lerPagina("3"), 3);
  assert.equal(lerPagina("0"), 1);
  assert.equal(lerPagina("-2"), 1);
  assert.equal(lerPagina("abc"), 1);
  assert.equal(lerPagina(["2"]), 1);
});

test("faixa mostrada", () => {
  assert.deepEqual(faixaDaPagina(1, 120, 50), { atual: 1, ultima: 3, de: 1, ate: 50, total: 120, pular: 0, anterior: false, proxima: true });
  const ultima = faixaDaPagina(3, 120, 50);
  assert.equal(ultima.de, 101);
  assert.equal(ultima.ate, 120);
  assert.equal(ultima.proxima, false);
  assert.equal(faixaDaPagina(9, 120, 50).atual, 3); // página além do fim vai para a última
  assert.deepEqual([faixaDaPagina(1, 0).de, faixaDaPagina(1, 0).ate], [0, 0]);
});

test("link mantém os filtros", () => {
  assert.equal(hrefPagina("/os", { status: "ABERTA", q: "joão" }, 2), "/os?status=ABERTA&q=jo%C3%A3o&pagina=2");
  assert.equal(hrefPagina("/clientes", { q: undefined }, 1), "/clientes");
});
