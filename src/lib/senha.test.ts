import { strict as assert } from "node:assert";
import { test } from "node:test";
import { conferirSenha, gerarHash } from "./senha";

test("hash de senha", async () => {
  const hash = await gerarHash("minhaSenha123");
  assert.ok(hash.startsWith("scrypt$"));
  assert.equal(await conferirSenha("minhaSenha123", hash), true);
  assert.equal(await conferirSenha("outra", hash), false);
  assert.equal(await conferirSenha("x", "lixo"), false);
});
