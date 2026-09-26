import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { PERFIS, pode, type Permissao } from "@/lib/permissoes";
import { sair } from "../login/actions";

const menu: { href: string; label: string; permissao?: Permissao; embreve?: boolean }[] = [
  { href: "/", label: "Início" },
  { href: "/vendas", label: "Vendas", permissao: "vendas" },
  { href: "/os", label: "Ordens de serviço", permissao: "os" },
  { href: "/clientes", label: "Clientes", permissao: "clientes" },
  { href: "/estoque", label: "Estoque", permissao: "estoque" },
  { href: "/financeiro", label: "Financeiro", permissao: "financeiro" },
  { href: "/notas", label: "Notas fiscais", permissao: "notasFiscais" },
  { href: "/usuarios", label: "Usuários", permissao: "usuarios" },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuario = await exigirUsuario();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col border-b border-zinc-200 bg-white md:w-56 md:border-r md:border-b-0 print:hidden">
        <div className="px-5 py-4 text-lg font-bold tracking-tight">iDesk</div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 text-sm md:flex-col">
          {menu
            .filter((item) => !item.permissao || pode(usuario.perfil, item.permissao))
            .map((item) =>
              item.embreve ? (
                <span key={item.label} className="whitespace-nowrap rounded-md px-3 py-2 text-zinc-400">
                  {item.label}
                </span>
              ) : (
                <Link key={item.label} href={item.href} className="whitespace-nowrap rounded-md px-3 py-2 hover:bg-zinc-100">
                  {item.label}
                </Link>
              ),
            )}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-200 px-5 py-3 text-sm">
          <div>
            <div className="font-medium">{usuario.nome}</div>
            <div className="text-xs text-zinc-500">{PERFIS[usuario.perfil]}</div>
          </div>
          <form action={sair}>
            <button className="text-xs text-zinc-500 underline">Sair</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">{children}</main>
    </div>
  );
}
