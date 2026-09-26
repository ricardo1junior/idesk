import Link from "next/link";
import { PDV } from "@/components/PDV";
import { exigirUsuario } from "@/lib/auth";

export default async function NovaVenda() {
  await exigirUsuario("vendas");
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/vendas" className="text-sm text-zinc-500 hover:underline">
          ← Vendas
        </Link>
        <h1 className="text-2xl font-semibold">Nova venda</h1>
      </div>
      <PDV />
    </div>
  );
}
