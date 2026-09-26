import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { ConferenciaXml } from "./ConferenciaXml";

export default async function ImportarNota() {
  await exigirUsuario("notasFiscais");
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/notas" className="text-sm text-zinc-500 hover:underline">
          ← Notas fiscais
        </Link>
        <h1 className="text-2xl font-semibold">Importar XML de compra</h1>
        <p className="text-sm text-zinc-500">
          Envie o XML da NF-e do fornecedor. Confira cada item antes de confirmar: o estoque, o custo médio e as contas a pagar são atualizados na hora.
        </p>
      </div>
      <ConferenciaXml />
    </div>
  );
}
