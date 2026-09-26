import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { focusConfigurado } from "@/lib/nfe/focus";
import { FormEmpresaFiscal } from "./FormEmpresaFiscal";

export default async function ConfiguracaoFiscal() {
  await exigirUsuario("notasFiscais");
  const empresa = await prisma.empresaFiscal.findUnique({ where: { id: "empresa" } });
  const ambiente = empresa?.ambiente ?? "HOMOLOGACAO";
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/notas" className="text-sm text-zinc-500 hover:underline">
          ← Notas fiscais
        </Link>
        <h1 className="text-2xl font-semibold">Dados fiscais da empresa</h1>
      </div>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Os códigos abaixo vêm preenchidos para o <b>Simples Nacional</b> (CSOSN 102, CFOP 5102/6102, PIS/COFINS 07). Confirme cada um com o seu contador
        antes de mudar para produção. O certificado digital A1, as séries e o CSC da NFC-e são cadastrados no painel da Focus NFe.
        {!focusConfigurado(ambiente) && (
          <p className="mt-2 font-medium">A chave da Focus NFe ainda não foi configurada no servidor (FOCUSNFE_TOKEN). Sem ela, a emissão mostra um aviso e não envia nada.</p>
        )}
      </div>
      <FormEmpresaFiscal
        empresa={
          empresa
            ? Object.fromEntries(Object.entries(empresa).map(([k, v]) => [k, v == null ? "" : String(v)]))
            : undefined
        }
      />
    </div>
  );
}
