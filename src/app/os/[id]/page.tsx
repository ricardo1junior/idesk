import Link from "next/link";
import { notFound } from "next/navigation";
import { FichaAparelho } from "@/components/FichaAparelho";
import { StatusBadge } from "@/components/StatusBadge";
import { formatarDocumento } from "@/lib/documentos";
import { formatarMoeda, STATUS_OS, TIPOS_SENHA } from "@/lib/os";
import { definirDesconto, mudarStatus, removerItem } from "../actions";
import { carregarOS } from "./dados";
import { NovoItem, RevelarSenha } from "./Interacoes";

export default async function DetalheOS({ params }: PageProps<"/os/[id]">) {
  const { id } = await params;
  const os = await carregarOS(id);
  if (!os) notFound();

  const subtotal = os.itens.reduce((s, i) => s + Number(i.valorUnit) * i.quantidade, 0);
  const whatsapp = (os.cliente.whatsapp || os.cliente.telefone || "").replace(/\D/g, "");

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/os" className="text-sm text-zinc-500 hover:underline">
            ← Ordens de serviço
          </Link>
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            OS #{os.numero} <StatusBadge status={os.status} />
          </h1>
          <p className="text-sm text-zinc-500">Aberta em {os.criadoEm.toLocaleString("pt-BR")}</p>
        </div>
        <div className="flex gap-2">
          {whatsapp && (
            <a
              className="btn-secundario"
              target="_blank"
              href={`https://wa.me/55${whatsapp}?text=${encodeURIComponent(
                `Olá ${os.cliente.nome.split(" ")[0]}, sua OS #${os.numero} (${os.aparelho?.modelo ?? "aparelho"}) está: ${STATUS_OS[os.status].label}. Total: ${formatarMoeda(os.total)}.`,
              )}`}
            >
              WhatsApp
            </a>
          )}
          <Link href={`/os/${os.id}/imprimir`} className="btn-secundario">
            Imprimir
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Cliente</h2>
        <Link href={`/clientes/${os.cliente.id}`} className="font-medium hover:underline">
          {os.cliente.nome}
        </Link>
        <div className="text-sm text-zinc-500">
          {formatarDocumento(os.cliente.documento)} · {os.cliente.whatsapp || os.cliente.telefone || "sem telefone"}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Aparelho</h2>
        <FichaAparelho
          os={os}
          senha={
            os.senhaAparelho ? (
              <RevelarSenha osId={os.id} tipo={os.tipoSenha} rotulo={TIPOS_SENHA[os.tipoSenha]} />
            ) : undefined
          }
        />
        <div className="mt-4 text-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Defeito relatado</div>
          <p className="whitespace-pre-line">{os.defeitoRelatado}</p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Serviços e peças</h2>
        <table className="mb-4 w-full text-sm">
          <tbody>
            {os.itens.map((i) => (
              <tr key={i.id} className="border-b border-zinc-100">
                <td className="py-2">{i.descricao}</td>
                <td className="py-2 text-right text-zinc-500">
                  {i.quantidade} × {formatarMoeda(i.valorUnit)}
                </td>
                <td className="w-32 py-2 text-right">{formatarMoeda(Number(i.valorUnit) * i.quantidade)}</td>
                <td className="w-10 py-2 text-right">
                  <form action={removerItem.bind(null, os.id, i.id)}>
                    <button className="text-zinc-400 hover:text-red-600" aria-label="Remover item">
                      ×
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {os.itens.length === 0 && (
              <tr>
                <td className="py-3 text-zinc-500">Nenhum item lançado.</td>
              </tr>
            )}
          </tbody>
        </table>
        <NovoItem osId={os.id} />
        <div className="mt-4 flex flex-wrap items-end justify-end gap-6 text-sm">
          <div>Subtotal: {formatarMoeda(subtotal)}</div>
          <form key={os.desconto.toString()} action={definirDesconto.bind(null, os.id)} className="flex items-end gap-2">
            <label className="campo w-28">
              <span>Desconto</span>
              <input name="desconto" inputMode="decimal" defaultValue={Number(os.desconto).toFixed(2).replace(".", ",")} />
            </label>
            <button className="btn-secundario">Aplicar</button>
          </form>
          <div className="text-lg font-semibold">Total: {formatarMoeda(os.total)}</div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Andamento</h2>
        <form key={os.atualizadoEm.toISOString()} action={mudarStatus.bind(null, os.id)} className="grid gap-3 sm:grid-cols-4">
          <label className="campo">
            <span>Novo status</span>
            <select name="status" defaultValue={os.status}>
              {Object.entries(STATUS_OS).map(([valor, s]) => (
                <option key={valor} value={valor}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="campo sm:col-span-3">
            <span>Anotação</span>
            <input name="nota" placeholder="ex.: cliente aprovou por telefone" />
          </label>
          <label className="campo sm:col-span-4">
            <span>Diagnóstico técnico</span>
            <textarea name="diagnostico" rows={2} defaultValue={os.diagnostico ?? ""} />
          </label>
          <div>
            <button className="btn-primario">Atualizar</button>
          </div>
        </form>
        <ol className="mt-5 space-y-2 border-l border-zinc-200 pl-4 text-sm">
          {os.historico.map((h) => (
            <li key={h.id}>
              <StatusBadge status={h.status} />{" "}
              <span className="text-zinc-500">{h.criadoEm.toLocaleString("pt-BR")}</span>
              {h.nota && <div className="text-zinc-700">{h.nota}</div>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
