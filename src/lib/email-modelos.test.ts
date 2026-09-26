import assert from "node:assert/strict";
import { test } from "node:test";
import { emailOS, emailVenda } from "./email-modelos";

test("e-mail da OS escapa HTML e mostra o que falta pagar", () => {
  const e = emailOS({
    loja: "Loja <Teste>",
    cliente: "Maria da Silva",
    numero: 12,
    status: "Orçamento enviado",
    aparelho: "iPhone 13",
    imei: "351111111111118",
    defeito: "Tela <quebrada>",
    diagnostico: null,
    previsao: new Date("2026-10-01T12:00:00Z"),
    garantiaDias: 90,
    itens: [{ descricao: "Troca de tela", quantidade: 1, valor: 900 }],
    desconto: 100,
    total: 800,
    pago: 300,
  });
  assert.match(e.assunto, /nº 12/);
  assert.ok(e.html.includes("Tela &lt;quebrada&gt;"));
  assert.ok(!e.html.includes("<quebrada>"));
  assert.ok(e.html.includes("Falta pagar"));
  assert.match(e.texto, /Olá, Maria/);
});

test("e-mail da venda lista garantia, pagamentos e nota", () => {
  const e = emailVenda({
    loja: "iDesk",
    cliente: "João",
    numero: 5,
    data: new Date(),
    itens: [{ descricao: "iPhone 15", detalhe: "IMEI 356111111111119", quantidade: 1, valor: 6499, garantiaDias: 365 }],
    subtotal: 6499,
    desconto: 0,
    total: 6499,
    pagamentos: [{ forma: "PIX", valor: 6499 }],
    notas: [{ modelo: "NFC-e", numero: "10", link: "https://exemplo/danfe" }],
  });
  assert.ok(e.html.includes("Garantia de 365 dias"));
  assert.ok(e.html.includes("https://exemplo/danfe"));
  assert.match(e.texto, /PIX/);
});
