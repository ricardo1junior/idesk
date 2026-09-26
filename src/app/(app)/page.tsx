import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pode } from "@/lib/permissoes";
import { dataHoraLocal, somarDias, ymdLocal } from "@/lib/tempo";
import { formatarReais } from "@/lib/vendas";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const usuario = await exigirUsuario();
  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);
  const hoje = ymdLocal(new Date());
  const [agendadosHoje, entregasAbertas] = await Promise.all([
    prisma.agendamento.count({ where: { inicio: { gte: dataHoraLocal(hoje, "00:00"), lt: dataHoraLocal(somarDias(hoje, 1), "00:00") }, status: { in: ["AGENDADO", "CONFIRMADO"] } } }),
    prisma.entrega.count({ where: { status: { in: ["PENDENTE", "EM_ROTA"] } } }),
  ]);
  const [osAbertas, clientes, aparelhos, vendasHoje] = await Promise.all([
    prisma.ordemServico.count({ where: { status: { notIn: ["ENTREGUE", "CANCELADA"] } } }),
    prisma.cliente.count(),
    prisma.aparelho.count({ where: { situacao: "EM_ESTOQUE" } }),
    prisma.venda.aggregate({ where: { status: "FINALIZADA", criadoEm: { gte: inicioDoDia } }, _sum: { total: true } }),
  ]);

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Olá, {usuario.nome.split(" ")[0]}</h1>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {pode(usuario.perfil, "vendas") && <Indicador titulo="Vendido hoje" valor={formatarReais(Number(vendasHoje._sum.total ?? 0))} />}
        {pode(usuario.perfil, "agenda") && (
          <Link href="/agenda">
            <Indicador titulo="Clientes agendados hoje" valor={agendadosHoje} />
          </Link>
        )}
        {pode(usuario.perfil, "entregas") && entregasAbertas > 0 && (
          <Link href="/entregas">
            <Indicador titulo="Entregas a fazer" valor={entregasAbertas} />
          </Link>
        )}
        <Indicador titulo="OS em andamento" valor={osAbertas} />
        <Indicador titulo="Aparelhos em estoque" valor={aparelhos} />
        <Indicador titulo="Clientes" valor={clientes} />
      </div>
      <div className="flex gap-2">
        {pode(usuario.perfil, "vendas") && (
          <Link href="/vendas/nova" className="btn-primario">
            Nova venda
          </Link>
        )}
        {pode(usuario.perfil, "os") && (
          <Link href="/os/nova" className={pode(usuario.perfil, "vendas") ? "btn-secundario" : "btn-primario"}>
            Nova OS
          </Link>
        )}
        {pode(usuario.perfil, "clientes") && (
          <Link href="/clientes/novo" className="btn-secundario">
            Novo cliente
          </Link>
        )}
      </div>
    </div>
  );
}

function Indicador({ titulo, valor }: { titulo: string; valor: number | string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-cartao p-5">
      <div className="text-sm text-zinc-500">{titulo}</div>
      <div className="mt-1 text-3xl font-semibold">{valor}</div>
    </div>
  );
}
