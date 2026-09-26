import { exigirUsuario } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnviarEmail } from "@/components/EnviarEmail";
import { FichaAparelho } from "@/components/FichaAparelho";
import { IconeWhatsApp, LinkWhatsApp } from "@/components/LinkWhatsApp";
import { StatusBadge } from "@/components/StatusBadge";
import { VerificarImei } from "@/components/VerificarImei";
import { formatarDocumento } from "@/lib/documentos";
import { MAX_FOTOS_OS, TIPOS_FOTO } from "@/lib/fotos";
import { formatarMoeda, STATUS_OS, TIPOS_SENHA } from "@/lib/os";
import { pode } from "@/lib/permissoes";
import { FORMAS_PAGAMENTO } from "@/lib/vendas";
import { definirDesconto, mudarStatus, removerFoto, removerItem } from "../actions";
import { enviarEmailOS } from "../../email/actions";
import { carregarOS } from "./dados";
import { AdicionarFotos, NovoItem, PagamentoOS, RevelarSenha } from "./Interacoes";

export default async function DetalheOS({ params }: PageProps<"/os/[id]">) {
  const usuario = await exigirUsuario("os");
  const { id } = await params;
  const os = await carregarOS(id);
  if (!os) notFound();

  const pago = os.lancamentos.reduce((s, l) => s + Number(l.valor), 0);
  const restante = Math.round((Number(os.total) - pago) * 100) / 100;
  const subtotal = os.itens.reduce((s, i) => s + Number(i.valorUnit) * i.quantidade, 0);
  const editar = pode(usuario.perfil, "editarOS");
  const receber = pode(usuario.perfil, "receberOS");
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
        <div className="flex flex-wrap items-start gap-2">
          {whatsapp && (
            <LinkWhatsApp
              className="btn-secundario gap-2"
              telefone={whatsapp}
              mensagem={`Olá ${os.cliente.nome.split(" ")[0]}, sua OS #${os.numero} (${os.aparelho?.modelo ?? "aparelho"}) está: ${STATUS_OS[os.status].label}. Total: ${formatarMoeda(os.total)}.`}
            >
              <IconeWhatsApp /> WhatsApp
            </LinkWhatsApp>
          )}
          <Link href={`/os/${os.id}/imprimir`} className="btn-secundario">
            Imprimir
          </Link>
          {pode(usuario.perfil, "entregas") && (
            <Link href={`/entregas/nova?cliente=${os.cliente.id}&os=${os.id}`} className="btn-secundario">
              Agendar entrega
            </Link>
          )}
          <EnviarEmail emails={emailsDoCliente(os.cliente)} enviar={enviarEmailOS.bind(null, os.id)} />
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Cliente</h2>
        <Link href={`/clientes/${os.cliente.id}`} className="font-medium hover:underline">
          {os.cliente.nome}
        </Link>
        <div className="text-sm text-zinc-500">
          {formatarDocumento(os.cliente.documento)} · {whatsapp ? <LinkWhatsApp telefone={whatsapp} /> : "sem telefone"}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Aparelho</h2>
        <FichaAparelho
          os={os}
          senha={
            os.senhaAparelho && pode(usuario.perfil, "verSenhaAparelho") ? (
              <RevelarSenha osId={os.id} tipo={os.tipoSenha} rotulo={TIPOS_SENHA[os.tipoSenha]} />
            ) : undefined
          }
        />
        {os.aparelho?.imei && pode(usuario.perfil, "verificarImei") && (
          <div className="mt-4 border-t border-zinc-100 pt-4">
            <div className="mb-2 text-xs font-medium text-zinc-500">Restrições e garantia Apple</div>
            <VerificarImei imei={os.aparelho.imei} aparelhoId={os.aparelho.id} />
          </div>
        )}
        <div className="mt-4 text-sm">
          <div className="text-xs font-medium text-zinc-500">Defeito relatado</div>
          <p className="whitespace-pre-line">{os.defeitoRelatado}</p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Fotos do aparelho ({os.fotos.length})</h2>
        {os.fotos.length > 0 && (
          <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {os.fotos.map((f) => (
              <li key={f.id} className="overflow-hidden rounded-lg border border-zinc-200">
                <a href={`/fotos-os/${f.id}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto protegida por login, servida pela rota da OS */}
                  <img src={`/fotos-os/${f.id}`} alt={`${TIPOS_FOTO[f.tipo]}${f.legenda ? `: ${f.legenda}` : ""}`} loading="lazy" className="aspect-square w-full object-cover" />
                </a>
                <div className="flex items-start justify-between gap-2 p-2 text-xs">
                  <div>
                    <div className="font-medium">{TIPOS_FOTO[f.tipo]}</div>
                    {f.legenda && <div className="text-zinc-500">{f.legenda}</div>}
                  </div>
                  {editar && (
                    <form action={removerFoto.bind(null, os.id, f.id)}>
                      <button className="text-zinc-400 hover:text-red-600" aria-label="Apagar foto">
                        ×
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <AdicionarFotos osId={os.id} restantes={MAX_FOTOS_OS - os.fotos.length} />
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
                  {editar && (
                    <form action={removerItem.bind(null, os.id, i.id)}>
                      <button className="text-zinc-400 hover:text-red-600" aria-label="Remover item">
                        ×
                      </button>
                    </form>
                  )}
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
        {editar && <NovoItem osId={os.id} />}
        <div className="mt-4 flex flex-wrap items-end justify-end gap-6 text-sm">
          <div>Subtotal: {formatarMoeda(subtotal)}</div>
          {editar ? (
            <form key={os.desconto.toString()} action={definirDesconto.bind(null, os.id)} className="flex items-end gap-2">
              <label className="campo w-28">
                <span>Desconto</span>
                <input name="desconto" inputMode="decimal" defaultValue={Number(os.desconto).toFixed(2).replace(".", ",")} />
              </label>
              <button className="btn-secundario">Aplicar</button>
            </form>
          ) : (
            Number(os.desconto) > 0 && <div>Desconto: {formatarMoeda(os.desconto)}</div>
          )}
          <div className="text-lg font-semibold">Total: {formatarMoeda(os.total)}</div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Pagamento</h2>
        {os.lancamentos.length > 0 && (
          <table className="mb-4 w-full text-sm">
            <tbody>
              {os.lancamentos.map((l) => (
                <tr key={l.id} className="border-b border-zinc-100">
                  <td className="py-1.5">
                    {l.forma ? FORMAS_PAGAMENTO[l.forma] : "-"}
                    {l.parcela && ` ${l.parcela}/${l.totalParcelas}`}
                  </td>
                  <td className="py-1.5 text-zinc-500">
                    {l.status === "PAGO" ? `pago em ${l.pagoEm?.toLocaleDateString("pt-BR")}` : `a receber em ${l.vencimento.toLocaleDateString("pt-BR")}`}
                  </td>
                  <td className="py-1.5 text-right">{formatarMoeda(l.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {restante > 0 && !receber ? (
          <p className="text-sm text-zinc-500">Falta receber {formatarMoeda(restante)}.</p>
        ) : restante > 0 ? (
          <PagamentoOS osId={os.id} sugerido={restante.toFixed(2).replace(".", ",")} />
        ) : (
          <p className="text-sm text-green-700">{Number(os.total) > 0 ? "OS paga." : "Lance os serviços e peças para registrar o pagamento."}</p>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="titulo-secao">Andamento</h2>
        {editar && (
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
        )}
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

function emailsDoCliente(c: { email: string | null; contatos: { tipo: string; valor: string }[] }) {
  return [...new Set([c.email, ...c.contatos.filter((x) => x.tipo === "EMAIL").map((x) => x.valor)].filter((e): e is string => !!e))];
}
