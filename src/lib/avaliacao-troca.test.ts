import assert from "node:assert/strict";
import { test } from "node:test";
import { linksDePesquisa, resumirPrecos } from "./avaliacao-troca";

test("resume preços ignorando zeros", () => {
  assert.deepEqual(resumirPrecos([1800, 2200, 0]), { quantidade: 2, media: 2000, minimo: 1800, maximo: 2200 });
  assert.equal(resumirPrecos([]), null);
});

test("monta a pesquisa do Mercado Livre com modelo e capacidade", () => {
  const ml = linksDePesquisa("iPhone 13 Pro", "128 GB")[0];
  assert.equal(ml.url, "https://lista.mercadolivre.com.br/iphone-13-pro-128gb-usado");
  assert.deepEqual(linksDePesquisa("  "), []);
});
