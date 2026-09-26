import { strict as assert } from "node:assert";
import { test } from "node:test";
import { calcularTotais, vendaSchema } from "./vendas";

const base = {
  clienteId: "c1",
  desconto: 0,
  observacoes: "",
};
const troca = {
  modelo: "iPhone 11",
  condicao: "SEMINOVO_B" as const,
  icloudDesativado: true as const,
  procedenciaDeclarada: true as const,
};

test("totais com quantidade, desconto por item e desconto geral", () => {
  const t = calcularTotais(
    [
      { quantidade: 3, valorUnit: 49.9, desconto: 9.7 }, // 149,70 - 9,70 = 140
      { quantidade: 1, valorUnit: 5999.99, desconto: 0 },
    ],
    40,
  );
  assert.deepEqual(t, { subtotal: 6139.99, total: 6099.99 });
});

test("pagamento com troca fecha o total", () => {
  const r = vendaSchema.safeParse({
    ...base,
    itens: [{ produtoId: "p", aparelhoId: "a", descricao: "iPhone 15", quantidade: 1, valorUnit: 5000, desconto: 200 }],
    pagamentos: [
      { forma: "TROCA", valor: 1800, parcelas: 1, troca },
      { forma: "PIX", valor: 3000, parcelas: 1, troca: null },
    ],
  });
  assert.equal(r.success, true);
});

test("rejeita pagamentos que não fecham", () => {
  const r = vendaSchema.safeParse({
    ...base,
    itens: [{ produtoId: "p", aparelhoId: null, descricao: "Capa", quantidade: 2, valorUnit: 100, desconto: 0 }],
    pagamentos: [{ forma: "PIX", valor: 150, parcelas: 1, troca: null }],
  });
  assert.equal(r.success, false);
});

test("troca exige cliente e iCloud desativado", () => {
  const semCliente = vendaSchema.safeParse({
    ...base,
    clienteId: null,
    itens: [{ produtoId: "p", aparelhoId: null, descricao: "Capa", quantidade: 1, valorUnit: 100, desconto: 0 }],
    pagamentos: [{ forma: "TROCA", valor: 100, parcelas: 1, troca }],
  });
  assert.equal(semCliente.success, false);
  const icloud = vendaSchema.safeParse({
    ...base,
    itens: [{ produtoId: "p", aparelhoId: null, descricao: "Capa", quantidade: 1, valorUnit: 100, desconto: 0 }],
    pagamentos: [{ forma: "TROCA", valor: 100, parcelas: 1, troca: { ...troca, icloudDesativado: false } }],
  });
  assert.equal(icloud.success, false);
});

test("aparelho com IMEI não pode ter quantidade 2", () => {
  const r = vendaSchema.safeParse({
    ...base,
    itens: [{ produtoId: "p", aparelhoId: "a", descricao: "iPhone", quantidade: 2, valorUnit: 100, desconto: 0 }],
    pagamentos: [{ forma: "PIX", valor: 200, parcelas: 1, troca: null }],
  });
  assert.equal(r.success, false);
});
