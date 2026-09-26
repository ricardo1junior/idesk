import assert from "node:assert/strict";
import { test } from "node:test";
import { lerFotosJson, tipoImagem } from "./fotos";

test("reconhece imagens pelos primeiros bytes", () => {
  assert.equal(tipoImagem(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(tipoImagem(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), "image/png");
  assert.equal(tipoImagem(new TextEncoder().encode("<svg>")), null);
});

test("lê a lista de fotos do formulário e ignora lixo", () => {
  assert.deepEqual(lerFotosJson('[{"id":"a","tipo":"RISCO","legenda":" tampa "}]'), [{ id: "a", tipo: "RISCO", legenda: "tampa" }]);
  assert.deepEqual(lerFotosJson('[{"id":"a","tipo":"XX"}]'), []);
  assert.deepEqual(lerFotosJson("{"), []);
});
