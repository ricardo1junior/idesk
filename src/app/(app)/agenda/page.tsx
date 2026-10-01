import Form from "next/form";
import Link from "next/link";
import { LinkWhatsApp } from "@/components/LinkWhatsApp";
import { horariosDoDia, MOTIVOS, OCUPA_VAGA, STATUS_AGENDAMENTO } from "@/lib/agenda";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { configLoja } from "@/lib/loja";
import { pode } from "@/lib/permissoes";
import { dataHoraLocal, diaCurto, diaPorExtenso, horaLocal, somarDias, ymdLocal, ymdValido } from "@/lib/tempo";
import { BotaoStatus } from "./BotaoStatus";
import { NovoAgendamento } from "./NovoAgendamento";

export default async function Agenda({ searchParams }: PageProps<"/agenda">) {
  const usuario = await exigirUsuario("agenda");
  const sp = await searchParams;
  const hoje = ymdLocal(new Date());
  const dia = ymdValido(sp.dia) ? sp.dia : hoje;
  const horaEscolhida = typeof sp.hora === "string" ? sp.hora : undefined;
  const config = await configLoja();

  const semana = Array.from({ length: 7 }, (_, i) => somarDias(dia, i - 3));
  const [agendamentos, daSemana, entregas] = await Promise.all([
    prisma.agendamento.findMany({
      where: { inicio: { gte: dataHoraLocal(dia, "00:00"), lt: dataHoraLocal(somarDias(dia, 1), "00:00") } },
      orderBy: { inicio: "asc" },
    }),
    prisma.agendamento.findMany({
      where: { inicio: { gte: dataHoraLocal(semana[0], "00:00"), lt: dataHoraLocal(somarDias(semana[6], 1), "00:00") }, status: { in: OCUPA_VAGA } },
      select: { inicio: true },
    }),
    pode(usuario.perfil, "entregas")
      ? prisma.entrega.findMany({
          where: { agendadaPara: { gte: dataHoraLocal(dia, "00:00"), lt: dataHoraLocal(somarDias(dia, 1), "00:00") }, status: { not: "CANCELADA" } },
          include: { cliente: { select: { nome: true } } },
          orderBy: { agendadaPara: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const horarios = horariosDoDia(dia, config, agendamentos);
  const porDia = (d: string) => daSemana.filter((a) => ymdLocal(a.inicio) === d).length;
  const livres = horarios.filter((h) => h.livre);
  const noHorario = (h: { inicio: Date; fim: Date }) => agendamentos.filter((a) => a.inicio < h.fim && h.inicio < a.fim && a.inicio >= h.inicio);
  const foraDaGrade = agendamentos.filter((a) => !horarios.some((h) => a.inicio >= h.inicio && a.inicio < h.fim));

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-zinc-500 first-letter:uppercase">{diaPorExtenso(dia)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/agenda?dia=${somarDias(dia, -1)}`} className="btn-secundario" aria-label="Dia anterior">
            ‹
          </Link>
          <Link href="/agenda" className="btn-secundario">
            Hoje
          </Link>
          <Link href={`/agenda?dia=${somarDias(dia, 1)}`} className="btn-secundario" aria-label="Próximo dia">
            ›
          </Link>
          <Form action="/agenda" className="flex items-center gap-2">
            <input type="date" name="dia" defaultValue={dia} key={dia} required aria-label="Ir para o dia" className="rounded-md border border-zinc-300 bg-cartao px-3 py-1.5 text-sm" />
            <button className="btn-secundario">Ir</button>
          </Form>
          {pode(usuario.perfil, "configuracoes") && (
            <Link href="/configuracoes" className="text-sm text-link hover:underline">
              Horários da loja
            </Link>
          )}
        </div>
      </div>

      <nav className="grid grid-cols-7 gap-2" aria-label="Semana">
        {semana.map((d) => (
          <Link
            key={d}
            href={`/agenda?dia=${d}`}
            aria-current={d === dia ? "date" : undefined}
            className={`rounded-lg px-2 py-2 text-center text-xs transition ${d === dia ? "bg-azul text-white" : "bg-cartao text-zinc-700 hover:bg-zinc-100"} ${
              !config.diasSemana.includes(new Date(`${d}T12:00:00Z`).getUTCDay()) ? "opacity-50" : ""
            }`}
          >
            <div className="capitalize">{diaCurto(d)}</div>
            <div className="mt-0.5 font-semibold">{porDia(d) ? `${porDia(d)} agend.` : "—"}</div>
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-lg border border-zinc-200 bg-cartao p-5">
          <h2 className="titulo-secao">
            Horários {horarios.length > 0 && <span className="text-sm font-normal text-zinc-500">· {livres.length} livres</span>}
          </h2>
          {horarios.length === 0 && <p className="text-sm text-zinc-500">A loja não abre neste dia.</p>}
          <ol className="divide-y divide-zinc-100">
            {horarios.map((h) => {
              const lista = noHorario(h);
              const hh = horaLocal(h.inicio);
              return (
                <li key={h.inicio.toISOString()} className={`flex gap-4 py-2.5 ${h.passado ? "opacity-60" : ""}`}>
                  <div className="w-14 shrink-0 pt-1 text-sm font-medium tabular-nums">{hh}</div>
                  <div className="flex-1 space-y-2">
                    {lista.map((a) => (
                      <CartaoAgendamento key={a.id} a={a} />
                    ))}
                    {h.livre && (
                      <Link
                        href={`/agenda?dia=${dia}&hora=${hh}#novo`}
                        className={`inline-block rounded-full px-3 py-1 text-xs ${horaEscolhida === hh ? "bg-azul text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                      >
                        + Livre{config.atendimentosSimultaneos > 1 ? ` (${config.atendimentosSimultaneos - h.ocupados} vaga${config.atendimentosSimultaneos - h.ocupados > 1 ? "s" : ""})` : ""}
                      </Link>
                    )}
                    {!h.livre && !h.passado && lista.length === 0 && <span className="text-xs text-zinc-400">Cheio</span>}
                  </div>
                </li>
              );
            })}
          </ol>
          {foraDaGrade.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
              <div className="text-xs font-medium text-zinc-500">Fora do horário da grade</div>
              {foraDaGrade.map((a) => (
                <CartaoAgendamento key={a.id} a={a} />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section id="novo" className="rounded-lg border border-zinc-200 bg-cartao p-5">
            <h2 className="titulo-secao">Novo agendamento</h2>
            {livres.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum horário livre neste dia.</p>
            ) : (
              <NovoAgendamento
                key={`${dia}-${horaEscolhida}`}
                dia={dia}
                horarios={livres.map((h) => horaLocal(h.inicio))}
                hora={horaEscolhida && livres.some((h) => horaLocal(h.inicio) === horaEscolhida) ? horaEscolhida : horaLocal(livres[0].inicio)}
                duracao={config.duracaoAtendimento}
              />
            )}
          </section>

          {entregas.length > 0 && (
            <section className="rounded-lg border border-zinc-200 bg-cartao p-5">
              <h2 className="titulo-secao">Entregas do dia</h2>
              <ul className="space-y-2 text-sm">
                {entregas.map((e) => (
                  <li key={e.id}>
                    <Link href={`/entregas#e${e.numero}`} className="hover:underline">
                      <b>{e.agendadaPara ? horaLocal(e.agendadaPara) : "--:--"}</b> {e.tipo === "COLETA" ? "Coleta" : "Entrega"} · {e.cliente.nome}
                      {e.minutosTotal ? <span className="text-zinc-500"> · ~{e.minutosTotal} min fora</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );

  function CartaoAgendamento({ a }: { a: (typeof agendamentos)[number] }) {
    const st = STATUS_AGENDAMENTO[a.status];
    const inativo = a.status === "CANCELADO" || a.status === "FALTOU";
    const msg = `Olá ${a.nome.split(" ")[0]}! Confirmando seu horário na loja ${diaPorExtenso(ymdLocal(a.inicio))} às ${horaLocal(a.inicio)}. Pode confirmar?`;
    const acao = (s: typeof a.status, rotulo: string, confirmar?: string) => <BotaoStatus id={a.id} status={s} rotulo={rotulo} confirmar={confirmar} />;
    return (
      <div className={`rounded-lg border border-zinc-200 p-3 text-sm ${inativo ? "bg-zinc-50 text-zinc-500" : "bg-cartao"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{a.clienteId ? <Link href={`/clientes/${a.clienteId}`} className="hover:underline">{a.nome}</Link> : a.nome}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${st.cor}`}>{st.label}</span>
          <span className="text-xs text-zinc-500">
            {horaLocal(a.inicio)}–{horaLocal(a.fim)} · {MOTIVOS[a.motivo]}
            {a.aparelho && ` · ${a.aparelho}`}
          </span>
        </div>
        {a.observacoes && <p className="mt-1 text-xs text-zinc-600">{a.observacoes}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {a.telefone && <LinkWhatsApp telefone={a.telefone} mensagem={msg} />}
          {a.status === "AGENDADO" && acao("CONFIRMADO", "Confirmar")}
          {(a.status === "AGENDADO" || a.status === "CONFIRMADO") && (
            <>
              {acao("ATENDIDO", "Chegou / atendido")}
              {acao("FALTOU", "Faltou", `Marcar que ${a.nome} faltou?`)}
              {acao("CANCELADO", "Cancelar", `Cancelar o agendamento de ${a.nome}?`)}
            </>
          )}
          {a.status === "ATENDIDO" && a.clienteId && (a.motivo === "REPARO" || a.motivo === "ORCAMENTO") && pode(usuario.perfil, "os") && (
            <Link href={`/os/nova?cliente=${a.clienteId}`} className="text-xs text-link hover:underline">
              Abrir OS
            </Link>
          )}
          {inativo && acao("AGENDADO", "Reativar")}
        </div>
      </div>
    );
  }
}
