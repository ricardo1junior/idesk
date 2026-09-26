import { test } from "node:test";
import assert from "node:assert/strict";
import { MODELOS_APPLE, capacidadesDoModelo } from "./catalogo-apple";

test("catálogo não tem nomes repetidos", () => {
  const nomes = MODELOS_APPLE.map((m) => m.nome);
  assert.equal(new Set(nomes).size, nomes.length);
});

test("capacidades seguem o modelo, sem diferenciar maiúsculas", () => {
  assert.deepEqual(capacidadesDoModelo("iphone 17 pro max"), ["256 GB", "512 GB", "1 TB", "2 TB"]);
  assert.ok(capacidadesDoModelo("Modelo desconhecido").includes("128 GB"));
});
