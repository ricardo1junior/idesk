import { test } from "node:test";
import assert from "node:assert/strict";
import { MODELOS_APPLE, capacidadesDoModelo, faltandoNoEstoque, produtosDoCatalogo } from "./catalogo-apple";

test("catálogo não tem nomes repetidos", () => {
  const nomes = MODELOS_APPLE.map((m) => m.nome);
  assert.equal(new Set(nomes).size, nomes.length);
});

test("capacidades seguem o modelo, sem diferenciar maiúsculas", () => {
  assert.deepEqual(capacidadesDoModelo("iphone 17 pro max"), ["256 GB", "512 GB", "1 TB", "2 TB"]);
  assert.ok(capacidadesDoModelo("Modelo desconhecido").includes("128 GB"));
});

test("importação pula o que já está no estoque e separa acessórios", () => {
  const faltando = faltandoNoEstoque(produtosDoCatalogo(), [
    { modelo: "iphone 15", descricao: "iPhone 15 usado" },
    { modelo: null, descricao: "AirPods 4" },
  ]);
  assert.equal(faltando.length, MODELOS_APPLE.length - 2);
  assert.equal(faltando.find((p) => p.modelo === "Apple Pencil Pro")?.tipo, "ACESSORIO");
  assert.equal(faltando.find((p) => p.modelo === "iPhone 17")?.tipo, "APARELHO");
});
