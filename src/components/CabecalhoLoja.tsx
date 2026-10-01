import { formatarDocumento, formatarTelefone } from "@/lib/documentos";
import { empresaAtual, urlLogo } from "@/lib/empresa";

/** Identificação da loja no topo da OS e do recibo impressos. */
export async function CabecalhoLoja() {
  const e = await empresaAtual();
  const logo = urlLogo(e);
  const linha = [e.razaoSocial, e.documento && formatarDocumento(e.documento)].filter(Boolean).join(" · ");
  const contato = [e.telefone && formatarTelefone(e.telefone), e.email, e.site].filter(Boolean).join(" · ");
  return (
    <div className="flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {logo && <img src={logo} alt="" className="max-h-14 max-w-32 object-contain" />}
      <div>
        <div className="text-xl font-bold">{e.nome}</div>
        {linha && <div className="text-xs text-zinc-500">{linha}</div>}
        {e.endereco && <div className="text-xs text-zinc-500">{e.endereco}</div>}
        {contato && <div className="text-xs text-zinc-500">{contato}</div>}
      </div>
    </div>
  );
}
