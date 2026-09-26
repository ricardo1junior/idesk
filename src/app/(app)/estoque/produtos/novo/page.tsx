import Link from "next/link";
import { ProdutoForm } from "@/components/ProdutoForm";
import { exigirUsuario } from "@/lib/auth";

export default async function NovoProduto() {
  await exigirUsuario("editarProdutos");
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/estoque" className="text-sm text-zinc-500 hover:underline">
          ← Estoque
        </Link>
        <h1 className="text-2xl font-semibold">Novo produto</h1>
      </div>
      <ProdutoForm />
    </div>
  );
}
