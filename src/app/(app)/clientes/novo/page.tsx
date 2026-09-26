import { exigirUsuario } from "@/lib/auth";
import Link from "next/link";
import { ClienteForm } from "@/components/ClienteForm";

export default async function NovoCliente() {
  await exigirUsuario("clientes");
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/clientes" className="text-sm text-zinc-500 hover:underline">
          ← Clientes
        </Link>
        <h1 className="text-2xl font-semibold">Novo cliente</h1>
      </div>
      <ClienteForm />
    </div>
  );
}
