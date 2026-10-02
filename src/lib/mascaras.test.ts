import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emailOpcional,
  imeiOpcional,
  imeiValido,
  mascaraCep,
  mascaraCnpj,
  mascaraCpf,
  mascaraCpfCnpj,
  mascaraDesconto,
  mascaraDinheiroComSinal,
  mascaraNome,
  mascaraSerial,
  mascaraTelefone,
  nomePessoa,
  nomeValido,
  telefoneOpcional,
  telefoneValido,
} from "./mascaras";

test("telefone é formatado enquanto digita e só aceita dígitos", () => {
  assert.equal(mascaraTelefone("1"), "(1");
  assert.equal(mascaraTelefone("119"), "(11) 9");
  assert.equal(mascaraTelefone("1133334444"), "(11) 3333-4444");
  assert.equal(mascaraTelefone("11999998888"), "(11) 99999-8888");
  assert.equal(mascaraTelefone("abc11 99999-8888 123"), "(11) 99999-8888");
});

test("telefone válido: DDD + fixo de 8 ou celular de 9 começando com 9", () => {
  assert.ok(telefoneValido("(11) 99999-8888"));
  assert.ok(telefoneValido("1133334444"));
  assert.ok(!telefoneValido("11899998888"));
  assert.ok(!telefoneValido("0199998888"));
  assert.ok(!telefoneValido("99998888"));
  assert.equal(telefoneOpcional().parse(""), null);
  assert.equal(telefoneOpcional().parse("(11) 99999-8888"), "11999998888");
  assert.ok(!telefoneOpcional().safeParse("123").success);
});

test("CPF, CNPJ e CEP com máscara progressiva", () => {
  assert.equal(mascaraCpf("529982"), "529.982");
  assert.equal(mascaraCpf("5299822"), "529.982.2");
  assert.equal(mascaraCpf("52998224725"), "529.982.247-25");
  assert.equal(mascaraCnpj("11222333000181"), "11.222.333/0001-81");
  assert.equal(mascaraCnpj("112223330"), "11.222.333/0");
  assert.equal(mascaraCpfCnpj("112223330001"), "11.222.333/0001");
  assert.equal(mascaraCep("01001000"), "01001-000");
  assert.equal(mascaraCep("0100"), "0100");
});

test("nome de pessoa não aceita números", () => {
  assert.equal(mascaraNome("Jo4ão d@ S1lva"), "João d Slva");
  assert.ok(nomeValido("Maria D'Ávila-Souza"));
  assert.ok(!nomeValido("Maria 2"));
  assert.ok(!nomePessoa().safeParse("Ana 123").success);
  assert.equal(nomePessoa().parse("  Ana   Maria "), "Ana Maria");
});

test("e-mail é validado e salvo em minúsculas", () => {
  assert.equal(emailOpcional().parse(" Ana@Loja.com.br "), "ana@loja.com.br");
  assert.equal(emailOpcional().parse(""), null);
  assert.ok(!emailOpcional().safeParse("ana@").success);
  assert.ok(!emailOpcional().safeParse("11999998888").success);
});

test("IMEI confere o dígito verificador", () => {
  assert.ok(imeiValido("490154203237518"));
  assert.ok(!imeiValido("490154203237517"));
  assert.equal(imeiOpcional().parse("490154203237518"), "490154203237518");
  assert.equal(imeiOpcional().parse(undefined), null);
  assert.ok(!imeiOpcional().safeParse("1234").success);
  assert.ok(!imeiOpcional().safeParse("490154203237517").success);
});

test("série e desconto", () => {
  assert.equal(mascaraSerial("f2l-xk 12ab"), "F2LXK12AB");
  assert.equal(mascaraDesconto("10%"), "10%");
  assert.equal(mascaraDesconto("1%0a"), "10");
  assert.equal(mascaraDinheiroComSinal("-20,5-"), "-20,5");
  assert.equal(mascaraDinheiroComSinal("R$ 1.200"), "1.200");
});
