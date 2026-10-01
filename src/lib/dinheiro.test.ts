import assert from "node:assert/strict";
import { test } from "node:test";
import { lerReais } from "./dinheiro";

test("lê valores em reais nos formatos que o lojista digita", () => {
  assert.equal(lerReais("1.299"), 1299);
  assert.equal(lerReais("1.299,90"), 1299.9);
  assert.equal(lerReais("1299,90"), 1299.9);
  assert.equal(lerReais("150.50"), 150.5);
  assert.equal(lerReais("150.5"), 150.5);
  assert.equal(lerReais("1,299.90"), 1299.9);
  assert.equal(lerReais("R$ 2.500,00"), 2500);
  assert.equal(lerReais("1.234.567"), 1234567);
  assert.equal(lerReais("20"), 20);
  assert.equal(lerReais("-20,5"), -20.5);
  assert.equal(lerReais(""), NaN);
  assert.equal(lerReais("abc"), NaN);
  assert.equal(lerReais("12.3456"), NaN);
  assert.equal(lerReais(35.9), 35.9);
});
