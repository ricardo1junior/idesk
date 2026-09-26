import { exigirUsuario } from "@/lib/auth";
import { notFound } from "next/navigation";
import { FichaAparelho } from "@/components/FichaAparelho";
import { formatarDocumento } from "@/lib/documentos";
import { formatarMoeda, STATUS_OS, TIPOS_SENHA } from "@/lib/os";
import { carregarOS } from "../dados";
import { BotaoImprimir } from "./BotaoImprimir";

export default async function ImprimirOS({ params }: PageProps<"/os/[id]/imprimir">) {
  await exigirUsuario("os");
  const { id } = await params;
  const os = await carregarOS(id);
  if (!os) notFound();
  const c = os.cliente;
  const endereco = [c.logradouro, c.numero, c.complemento, c.bairro, c.cidade && `${c.cidade}/${c.uf ?? ""}`]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm print:max-w-none print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <BotaoImprimir />
      </div>

      <header className="mb-4 flex items-start justify-between border-b-2 border-zinc-900 pb-3">
        <div>
          <div className="text-xl font-bold">iDesk</div>
          <div className="text-xs text-zinc-500">Assistência técnica e venda de aparelhos Apple</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">OS #{os.numero}</div>
          <div className="text-xs">Entrada: {os.criadoEm.toLocaleString("pt-BR")}</div>
          {os.previsaoEntrega && <div className="text-xs">Previsão: {os.previsaoEntrega.toLocaleDateString("pt-BR")}</div>}
          <div className="text-xs">Status: {STATUS_OS[os.status].label}</div>
        </div>
      </header>

      <Bloco titulo="Cliente">
        <div className="font-medium">{c.nome}</div>
        <div>
          {c.tipo === "PF" ? "CPF" : "CNPJ"}: {formatarDocumento(c.documento)}
          {(c.whatsapp || c.telefone) && ` · Tel.: ${c.whatsapp || c.telefone}`}
        </div>
        {endereco && <div>{endereco}</div>}
      </Bloco>

      <Bloco titulo="Aparelho">
        {/* A senha nunca sai impressa. */}
        <FichaAparelho os={os} senha={os.senhaAparelho ? `${TIPOS_SENHA[os.tipoSenha]} (registrada no sistema)` : undefined} />
      </Bloco>

      <Bloco titulo="Defeito relatado">
        <p className="whitespace-pre-line">{os.defeitoRelatado}</p>
        {os.diagnostico && (
          <>
            <div className="mt-2 font-medium">Diagnóstico</div>
            <p className="whitespace-pre-line">{os.diagnostico}</p>
          </>
        )}
      </Bloco>

      {os.itens.length > 0 && (
        <Bloco titulo="Orçamento">
          <table className="w-full">
            <tbody>
              {os.itens.map((i) => (
                <tr key={i.id} className="border-b border-zinc-200">
                  <td className="py-1">{i.descricao}</td>
                  <td className="py-1 text-right">
                    {i.quantidade} × {formatarMoeda(i.valorUnit)}
                  </td>
                  <td className="w-28 py-1 text-right">{formatarMoeda(Number(i.valorUnit) * i.quantidade)}</td>
                </tr>
              ))}
              {Number(os.desconto) > 0 && (
                <tr>
                  <td className="py-1" colSpan={2}>
                    Desconto
                  </td>
                  <td className="py-1 text-right">-{formatarMoeda(os.desconto)}</td>
                </tr>
              )}
              <tr className="font-bold">
                <td className="py-1" colSpan={2}>
                  Total
                </td>
                <td className="py-1 text-right">{formatarMoeda(os.total)}</td>
              </tr>
            </tbody>
          </table>
        </Bloco>
      )}

      <Bloco titulo="Termos">
        <ol className="list-decimal space-y-1 pl-5 text-xs text-zinc-700">
          <li>O cliente declara que o aparelho é de sua propriedade ou que tem autorização do proprietário.</li>
          <li>O estado do aparelho, marcas de uso e acessórios descritos acima foram conferidos na entrada junto com o cliente.</li>
          {os.precisaBackup ? (
            <li>O cliente solicitou backup dos dados antes do serviço, conforme descrito acima.</li>
          ) : (
            <li>O cliente foi orientado a fazer backup e declara estar ciente do risco de perda de dados durante o reparo.</li>
          )}
          <li>Garantia de {os.garantiaDias} dias sobre o serviço executado, contada a partir da entrega. A garantia não cobre mau uso, queda ou contato com líquidos.</li>
          <li>Aparelhos não retirados em até 90 dias após a conclusão poderão ser descartados ou vendidos para cobrir custos, conforme a legislação.</li>
        </ol>
      </Bloco>

      <div className="mt-12 grid grid-cols-2 gap-12 text-center text-xs">
        <div className="border-t border-zinc-900 pt-1">Assinatura do cliente</div>
        <div className="border-t border-zinc-900 pt-1">Responsável pela loja</div>
      </div>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 break-inside-avoid">
      <h2 className="mb-1 border-b border-zinc-300 text-xs font-bold">{titulo}</h2>
      {children}
    </section>
  );
}
