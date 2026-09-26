import { exigirUsuario } from "@/lib/auth";
import { PERFIS, pode, type Permissao } from "@/lib/permissoes";
import { sair } from "../login/actions";
import { EscolherTema } from "@/components/EscolherTema";
import { ItemMenu } from "./ItemMenu";

const menu: { href: string; label: string; permissao?: Permissao; embreve?: boolean }[] = [
  { href: "/", label: "Início" },
  { href: "/agenda", label: "Agenda", permissao: "agenda" },
  { href: "/vendas", label: "Vendas", permissao: "vendas" },
  { href: "/os", label: "Ordens de serviço", permissao: "os" },
  { href: "/clientes", label: "Clientes", permissao: "clientes" },
  { href: "/estoque", label: "Estoque", permissao: "estoque" },
  { href: "/financeiro", label: "Financeiro", permissao: "financeiro" },
  { href: "/notas", label: "Notas fiscais", permissao: "notasFiscais" },
  { href: "/entregas", label: "Entregas", permissao: "entregas" },
  { href: "/usuarios", label: "Usuários", permissao: "usuarios" },
  { href: "/configuracoes", label: "Configurações", permissao: "configuracoes" },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuario = await exigirUsuario();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="sticky top-0 z-20 flex flex-col border-b border-zinc-200/70 bg-cartao/75 backdrop-blur-xl backdrop-saturate-150 md:h-screen md:w-60 md:border-r md:border-b-0 print:hidden">
        <div className="flex items-center gap-2 px-5 py-5 text-xl font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-[10px] bg-zinc-900 text-sm text-zinc-50">i</span>
          iDesk
          <span className="ml-auto">
            <EscolherTema />
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 text-sm md:flex-col">
          {menu
            .filter((item) => !item.permissao || pode(usuario.perfil, item.permissao))
            .map((item) =>
              item.embreve ? (
                <span key={item.label} className="whitespace-nowrap rounded-md px-3 py-2 text-zinc-400">
                  {item.label}
                </span>
              ) : (
                <ItemMenu key={item.label} href={item.href}>
                  {item.label}
                </ItemMenu>
              ),
            )}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-200 px-5 py-3 text-sm">
          <div>
            <div className="font-medium">{usuario.nome}</div>
            <div className="text-xs text-zinc-500">{PERFIS[usuario.perfil]}</div>
          </div>
          <form action={sair}>
            <button className="text-xs text-link hover:underline">Sair</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-10 print:p-0">{children}</main>
    </div>
  );
}
