import assert from "node:assert/strict";
import { test } from "node:test";
import { aberturaOSSchema, itemOSSchema, orcamentoTravado, podeMudarStatusOS, resumoPagamentoOS, statusOSValido } from "./os";

test("valor do item aceita formatos brasileiros e com ponto decimal", () => {
  const valor = (v: string) => itemOSSchema.safeParse({ tipo: "SERVICO", descricao: "Troca de tela", quantidade: "1", valorUnit: v });
  assert.equal(valor("150.50").data?.valorUnit, 150.5);
  assert.equal(valor("1.500").data?.valorUnit, 1500);
  assert.equal(valor("1.299,90").data?.valorUnit, 1299.9);
  assert.equal(valor("").data?.valorUnit, 0);
  assert.equal(valor("abc").success, false);
  assert.equal(valor("-5").success, false);
});

test("previsão de entrega precisa ser uma data válida", () => {
  const base = { clienteId: "c1", modelo: "iPhone 13", tipoSenha: "NENHUMA", defeitoRelatado: "Tela quebrada" };
  assert.equal(aberturaOSSchema.safeParse({ ...base, previsaoEntrega: "2026-10-05" }).success, true);
  assert.equal(aberturaOSSchema.safeParse({ ...base, previsaoEntrega: "" }).success, true);
  assert.equal(aberturaOSSchema.safeParse({ ...base, previsaoEntrega: "05/10/2026" }).success, false);
});

test("transições de status da OS", () => {
  assert.ok(podeMudarStatusOS("ABERTA", "EM_EXECUCAO"));
  assert.ok(podeMudarStatusOS("EM_EXECUCAO", "EM_ANALISE"));
  assert.ok(podeMudarStatusOS("CONCLUIDA", "ENTREGUE"));
  assert.ok(podeMudarStatusOS("ENTREGUE", "CONCLUIDA"));
  assert.equal(podeMudarStatusOS("ENTREGUE", "ABERTA"), false);
  assert.equal(podeMudarStatusOS("CANCELADA", "ABERTA"), false);
  assert.ok(orcamentoTravado("ENTREGUE") && orcamentoTravado("CANCELADA") && !orcamentoTravado("CONCLUIDA"));
  assert.equal(statusOSValido("toString"), false);
  assert.equal(statusOSValido("ABERTA"), true);
});

test("resumo do pagamento separa recebido de a receber", () => {
  const r = resumoPagamentoOS(300, [
    { status: "PAGO", valor: 100 },
    { status: "PENDENTE", valor: 100 },
    { status: "CANCELADO", valor: 100 },
  ]);
  assert.deepEqual(r, { recebido: 100, aReceber: 100, faltaLancar: 100, quitada: false });
  const parcelado = resumoPagamentoOS(300, [{ status: "PAGO", valor: 100 }, { status: "PENDENTE", valor: 200 }]);
  assert.equal(parcelado.faltaLancar, 0);
  assert.equal(parcelado.quitada, false);
  assert.equal(resumoPagamentoOS(0.3, [{ status: "PAGO", valor: 0.1 }, { status: "PAGO", valor: 0.2 }]).quitada, true);
  assert.equal(resumoPagamentoOS(0, []).quitada, false);
});
