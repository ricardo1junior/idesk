import { exigirUsuario } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClienteForm } from "@/components/ClienteForm";
import { prisma } from "@/lib/db";
import { formatarCep, formatarTelefone } from "@/lib/documentos";
import { pode } from "@/lib/permissoes";
import { ExcluirCliente } from "./ExcluirCliente";

export default async function EditarCliente({ params, searchParams }: PageProps<"/clientes/[id]">) {
  const usuario = await exigirUsuario("clientes");
  const { id } = await params;
  const { salvo } = await searchParams;
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { contatos: { orderBy: { ordem: "asc" } }, enderecos: { orderBy: { ordem: "asc" } } },
  });
  if (!cliente) notFound();

  // O formulário trabalha com strings; datas vão no formato do input (AAAA-MM-DD).
  const { contatos, enderecos, ...dados } = cliente;
  const inicial = Object.fromEntries(
    Object.entries(dados).map(([k, v]) => [
      k,
      v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? "" : String(v),
    ]),
  );
  if (inicial.telefone) inicial.telefone = formatarTelefone(inicial.telefone);
  if (inicial.whatsapp) inicial.whatsapp = formatarTelefone(inicial.whatsapp);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/clientes" className="text-sm text-zinc-500 hover:underline">
            ← Clientes
          </Link>
          <h1 className="text-2xl font-semibold">{cliente.nome}</h1>
        </div>
        <div className="flex items-start gap-2">
          <Link href={`/os/nova?cliente=${cliente.id}`} className="btn-primario">
            Nova OS
          </Link>
          {pode(usuario.perfil, "excluirCliente") && <ExcluirCliente id={cliente.id} />}
        </div>
      </div>
      {salvo && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Cliente salvo.</div>
      )}
      <ClienteForm
        key={cliente.atualizadoEm.toISOString()}
        id={cliente.id}
        inicial={inicial}
        contatosIniciais={contatos.map((c) => ({ tipo: c.tipo, valor: c.tipo === "TELEFONE" ? formatarTelefone(c.valor) : c.valor, rotulo: c.rotulo ?? "", whatsapp: c.whatsapp }))}
        enderecosIniciais={enderecos.map((e) => ({
          rotulo: e.rotulo ?? "",
          cep: e.cep ? formatarCep(e.cep) : "",
          logradouro: e.logradouro ?? "",
          numero: e.numero ?? "",
          complemento: e.complemento ?? "",
          bairro: e.bairro ?? "",
          cidade: e.cidade ?? "",
          uf: e.uf ?? "",
        }))}
      />
    </div>
  );
}
