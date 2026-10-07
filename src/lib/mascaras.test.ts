import assert from "node:assert/strict";
import { test } from "node:test";
import { aplicarMascara, emailValido, imeiValido, nomeValido, telefoneValido } from "./mascaras";

test("máscaras enquanto digita", () => {
  assert.equal(aplicarMascara("nome", "Jo4ão  da S1lva!"), "João da Slva");
  assert.equal(aplicarMascara("nome", "Maria D'Ávila-Souza"), "Maria D'Ávila-Souza");
  assert.equal(aplicarMascara("telefone", "11a98765x4321"), "(11) 98765-4321");
  assert.equal(aplicarMascara("telefone", "1133224455"), "(11) 3322-4455");
  assert.equal(aplicarMascara("telefone", "119"), "(11) 9");
  assert.equal(aplicarMascara("telefone", "abc"), "");
  assert.equal(aplicarMascara("email", " Ana.Souza @Exemplo.com "), "ana.souza@exemplo.com");
  assert.equal(aplicarMascara("cpf", "123abc45678909"), "123.456.789-09");
  assert.equal(aplicarMascara("cnpj", "11222333000181"), "11.222.333/0001-81");
  assert.equal(aplicarMascara("documento", "1122233300018"), "11.222.333/0001-8");
  assert.equal(aplicarMascara("cep", "01310a100"), "01310-100");
  assert.equal(aplicarMascara("uf", "s1p"), "SP");
  assert.equal(aplicarMascara("imei", "35-123456 789012 34 9"), "351234567890123");
  assert.equal(aplicarMascara("serial", "f2l-xk 12ab"), "F2LXK12AB");
  assert.equal(aplicarMascara("dinheiro", "R$ 1.299,90"), "1.299,90");
  assert.equal(aplicarMascara("inteiro", "8a5%"), "85");
  assert.equal(aplicarMascara("inscricao", "isento"), "ISENTO");
  assert.equal(aplicarMascara("inscricao", "123.456.789-x"), "123.456.789-");
});

test("validações do servidor", () => {
  assert.ok(nomeValido("Ana Beatriz Souza"));
  assert.ok(nomeValido("José D'Ávila Jr."));
  assert.ok(!nomeValido("Ana 2"));
  assert.ok(!nomeValido("A"));
  assert.ok(!nomeValido("@na"));
  assert.ok(telefoneValido("(11) 98765-4321"));
  assert.ok(telefoneValido("1133224455"));
  assert.ok(!telefoneValido("11 8765-432")); // curto
  assert.ok(!telefoneValido("01987654321")); // DDD inválido
  assert.ok(!telefoneValido("11887654321")); // celular sem o 9
  assert.ok(emailValido("ana@exemplo.com.br"));
  assert.ok(!emailValido("ana@exemplo"));
  assert.ok(!emailValido("ana exemplo.com"));
  assert.ok(imeiValido("490154203237518"));
  assert.ok(!imeiValido("490154203237517"));
  assert.ok(!imeiValido("49015420323751"));
});

test("formulário de cliente rejeita nome com número e telefone com letra", async () => {
  const { clienteSchema } = await import("./clientes");
  const base = { tipo: "PF", nome: "Ana Souza", documento: "529.982.247-25", email: "", telefone: "", whatsapp: "", cep: "", uf: "" };
  assert.equal(clienteSchema.safeParse(base).success, true);
  const comNumero = clienteSchema.safeParse({ ...base, nome: "Ana S0uza" });
  assert.equal(comNumero.success, false);
  assert.equal(clienteSchema.safeParse({ ...base, tipo: "PJ", nome: "Loja 123 Ltda", documento: "11222333000181" }).success, true);
  assert.equal(clienteSchema.safeParse({ ...base, telefone: "11 9abc" }).success, false);
  assert.equal(clienteSchema.safeParse({ ...base, email: "ana@" }).success, false);
  const ok = clienteSchema.parse({ ...base, telefone: "(11) 98765-4321", email: "Ana@Exemplo.com", cep: "01310-100", uf: "sp" });
  assert.equal(ok.telefone, "11987654321");
  assert.equal(ok.email, "ana@exemplo.com");
  assert.equal(ok.cep, "01310100");
  assert.equal(ok.uf, "SP");
});
