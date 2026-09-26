import { strict as assert } from "node:assert";
import { test } from "node:test";
import { criptografar, descriptografar } from "./cripto";

process.env.APP_SECRET = "segredo-de-teste";

test("criptografa e recupera a senha", () => {
  const cifrado = criptografar("1234");
  assert.notEqual(cifrado, "1234");
  assert.notEqual(cifrado, criptografar("1234")); // IV aleatório
  assert.equal(descriptografar(cifrado), "1234");
});

test("rejeita conteúdo adulterado", () => {
  const [iv, tag] = criptografar("1234").split(".");
  assert.throws(() => descriptografar([iv, tag, Buffer.from("9999").toString("base64")].join(".")));
});
