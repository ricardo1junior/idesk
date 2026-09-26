import Link from "next/link";
import { LinkWhatsApp } from "@/components/LinkWhatsApp";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatarDuracao, STATUS_ENTREGA } from "@/lib/entregas";
import { configLoja } from "@/lib/loja";
import { linkGoogleMaps } from "@/lib/rotas";
import { dataLocal, horaLocal } from "@/lib/tempo";
import { formatarReais } from "@/lib/vendas";
import { mudarStatusEntrega } from "./actions";

export default async function Entregas() {
  await exigirUsuario("entregas");
  const incluir = {
    cliente: { select: { id: true, nome: true, telefone: true, whatsapp: true } },
    venda: { select: { id: true, numero: true } },
    os: { select: { id: true, numero: true } },
    responsavel: { select: { nome: true } },
  } as const;
  const [abertas, concluidas, loja] = await Promise.all([
    prisma.entrega.findMany({ where: { status: { in: ["PENDENTE", "EM_ROTA"] } }, include: incluir, orderBy: [{ agendadaPara: { sort: "asc", nulls: "last" } }, { criadoEm: "asc" }] }),
    prisma.entrega.findMany({ where: { status: { in: ["CONCLUIDA", "CANCELADA"] } }, include: incluir, orderBy: { criadoEm: "desc" }, take: 20 }),
    configLoja(),
  ]);

  const Linha = ({ e }: { e: (typeof abertas)[number] }) => {
    const st = STATUS_ENTREGA[e.status];
    const tel = e.cliente.whatsapp || e.cliente.telefone;
    const acao = (s: typeof e.status, rotulo: string, primario = false) => (
      <form action={mudarStatusEntrega.bind(null, e.id, s)}>
        <button className={primario ? "btn-primario px-4 py-1.5" : "text-sm text-link hover:underline"}>{rotulo}</button>
      </form>
    );
    return (
      <li id={`e${e.numero}`} className="scroll-mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-base">{e.agendadaPara ? `${dataLocal(e.agendadaPara)} ${horaLocal(e.agendadaPara)}` : "Sem horário"}</b>
              <span className={`rounded-full px-2 py-0.5 text-xs ${st.cor}`}>{st.label}</span>
              <span className="text-zinc-500">
                #{e.numero} · {e.tipo === "COLETA" ? "Coleta" : "Entrega"}
              </span>
            </div>
            <div>
              <Link href={`/clientes/${e.cliente.id}`} className="font-medium hover:underline">
                {e.cliente.nome}
              </Link>
              {tel && (
                <span className="ml-2">
                  <LinkWhatsApp telefone={tel} />
                </span>
              )}
            </div>
            <div className="text-zinc-700">{e.endereco}</div>
            <div className="text-zinc-500">
              {e.minutosTotal ? `~${formatarDuracao(e.minutosTotal)} fora da loja (${e.distanciaKm?.toLocaleString("pt-BR")} km até lá)` : "Tempo não calculado"}
              {Number(e.taxa) > 0 && ` · taxa ${formatarReais(Number(e.taxa))}`}
              {e.responsavel && ` · vai: ${e.responsavel.nome}`}
              {e.venda && (
                <>
                  {" · "}
                  <Link href={`/vendas/${e.venda.id}`} className="text-link hover:underline">
                    venda #{e.venda.numero}
                  </Link>
                </>
              )}
              {e.os && (
                <>
                  {" · "}
                  <Link href={`/os/${e.os.id}`} className="text-link hover:underline">
                    OS #{e.os.numero}
                  </Link>
                </>
              )}
            </div>
            {e.observacoes && <div className="text-zinc-600">Obs.: {e.observacoes}</div>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <a href={linkGoogleMaps(loja.endereco, e.endereco)} target="_blank" rel="noreferrer" className="btn-secundario px-4 py-1.5">
              Abrir rota
            </a>
            {e.status === "PENDENTE" && acao("EM_ROTA", "Saiu para entrega", true)}
            {e.status === "EM_ROTA" && acao("CONCLUIDA", "Concluir", true)}
            {e.status === "EM_ROTA" && tel && (
              <LinkWhatsApp telefone={tel} mensagem={`Olá ${e.cliente.nome.split(" ")[0]}! Saímos agora para a ${e.tipo === "COLETA" ? "coleta" : "entrega"}${e.minutosIda ? `, chegamos em cerca de ${formatarDuracao(e.minutosIda)}` : ""}.`}>
                <span className="text-sm text-link hover:underline">Avisar cliente</span>
              </LinkWhatsApp>
            )}
            {(e.status === "PENDENTE" || e.status === "EM_ROTA") && acao("CANCELADA", "Cancelar")}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Entregas e coletas</h1>
        <Link href="/entregas/nova" className="btn-primario">
          Nova entrega
        </Link>
      </div>
      <section>
        <h2 className="titulo-secao">A fazer ({abertas.length})</h2>
        {abertas.length === 0 ? <p className="text-sm text-zinc-500">Nenhuma entrega pendente.</p> : <ul className="space-y-3">{abertas.map((e) => <Linha key={e.id} e={e} />)}</ul>}
      </section>
      {concluidas.length > 0 && (
        <section>
          <h2 className="titulo-secao">Últimas concluídas e canceladas</h2>
          <ul className="space-y-3 opacity-80">
            {concluidas.map((e) => (
              <Linha key={e.id} e={e} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
