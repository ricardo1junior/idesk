import assert from "node:assert/strict";
import { test } from "node:test";
import { CONFIG_PADRAO, conflitoAgendamento, horariosDoDia } from "./agenda";
import { dataHoraLocal, somarDias, ymdLocal } from "./tempo";

const dia = "2026-10-01"; // quinta-feira
const antes = new Date("2026-09-01T12:00:00Z");

test("gera os horários do dia no fuso de Brasília", () => {
  const h = horariosDoDia(dia, CONFIG_PADRAO, [], antes);
  assert.equal(h.length, 18); // 9h às 18h de 30 em 30
  assert.equal(h[0].inicio.toISOString(), "2026-10-01T12:00:00.000Z");
  assert.ok(h.every((x) => x.livre));
});

test("domingo fechado e horários passados não ficam livres", () => {
  assert.deepEqual(horariosDoDia("2026-10-04", CONFIG_PADRAO, [], antes), []);
  const h = horariosDoDia(dia, CONFIG_PADRAO, [], dataHoraLocal(dia, "10:10"));
  assert.equal(h.filter((x) => x.passado).length, 2);
});

test("não deixa marcar dois clientes no mesmo horário quando só atende um", () => {
  const marcados = [{ inicio: dataHoraLocal(dia, "10:00"), fim: dataHoraLocal(dia, "10:30"), status: "AGENDADO" as const }];
  const h = horariosDoDia(dia, CONFIG_PADRAO, marcados, antes);
  assert.equal(h.find((x) => x.inicio.getTime() === dataHoraLocal(dia, "10:00").getTime())!.livre, false);
  assert.match(conflitoAgendamento(dia, dataHoraLocal(dia, "09:45"), dataHoraLocal(dia, "10:15"), CONFIG_PADRAO, marcados)!, /cheio/);
  assert.equal(conflitoAgendamento(dia, dataHoraLocal(dia, "10:30"), dataHoraLocal(dia, "11:00"), CONFIG_PADRAO, marcados), null);
  // cancelado libera a vaga
  assert.equal(conflitoAgendamento(dia, dataHoraLocal(dia, "10:00"), dataHoraLocal(dia, "10:30"), CONFIG_PADRAO, [{ ...marcados[0], status: "CANCELADO" }]), null);
  // com 2 atendentes cabe mais um
  assert.equal(conflitoAgendamento(dia, dataHoraLocal(dia, "10:00"), dataHoraLocal(dia, "10:30"), { ...CONFIG_PADRAO, atendimentosSimultaneos: 2 }, marcados), null);
  assert.match(conflitoAgendamento(dia, dataHoraLocal(dia, "17:45"), dataHoraLocal(dia, "18:15"), CONFIG_PADRAO, [])!, /Fora/);
});

test("datas em Brasília", () => {
  assert.equal(ymdLocal(new Date("2026-10-01T02:00:00Z")), "2026-09-30");
  assert.equal(somarDias("2026-09-30", 1), "2026-10-01");
});
