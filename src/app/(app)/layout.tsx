import { exigirUsuario } from "@/lib/auth";
import { PERFIS, pode, type Permissao } from "@/lib/permissoes";
import { sair } from "../login/actions";
import { EscolherTema } from "@/components/EscolherTema";
import { empresaAtual, urlLogo } from "@/lib/empresa";
import { estiloCor } from "@/lib/empresa-dados";
import { carteiraDaLoja } from "@/lib/carteira";
import Link from "next/link";
import { ItemMenu } from "./ItemMenu";
import { AssistenteIA } from "@/components/AssistenteIA";

const menu: { href: string; label: string; permissao?: Permissao; embreve?: boolean }[] = [
  { href: "/", label: "Início" },
  { href: "/agenda", label: "Agenda", permissao: "agenda" },
  { href: "/vendas", label: "Vendas", permissao: "vendas" },
  { href: "/os", label: "Ordens de serviço", permissao: "os" },
  { href: "/clientes", label: "Clientes", permissao: "clientes" },
  { href: "/estoque", label: "Estoque", permissao: "estoque" },
  { href: "/vitrine", label: "Vitrine 3D" },
  { href: "/financeiro", label: "Financeiro", permissao: "financeiro" },
  { href: "/notas", label: "Notas fiscais", permissao: "notasFiscais" },
  { href: "/entregas", label: "Entregas", permissao: "entregas" },
  { href: "/usuarios", label: "Usuários", permissao: "usuarios" },
  { href: "/configuracoes", label: "Configurações", permissao: "configuracoes" },
  { href: "/assinatura", label: "Assinatura", permissao: "assinatura" },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuario = await exigirUsuario();
  const [empresa, carteira] = await Promise.all([empresaAtual(), carteiraDaLoja(usuario.empresaId)]);
  const logo = urlLogo(empresa);
  const podeRecarregar = pode(usuario.perfil, "assinatura");

  return (
    <div className="flex min-h-screen flex-col" style={estiloCor(empresa.corDestaque)}>
      <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-cartao/75 backdrop-blur-xl backdrop-saturate-150 print:hidden">
        <div className="flex items-center gap-3 px-4 pt-3 md:px-10">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold tracking-tight">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="size-8 shrink-0 rounded-[10px] object-contain" />
            ) : (
              <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-zinc-900 text-sm text-zinc-50">{empresa.nome.trim().charAt(0).toUpperCase() || "i"}</span>
            )}
            <span className="truncate text-base" title={empresa.nome}>
              {empresa.nome}
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-3 text-sm">
            <EscolherTema />
            <div className="hidden text-right leading-tight sm:block">
              <div className="font-medium">{usuario.nome}</div>
              <div className="text-xs text-zinc-500">{PERFIS[usuario.perfil]}</div>
            </div>
            <form action={sair}>
              <button className="text-xs text-link hover:underline">Sair</button>
            </form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-2 text-sm md:px-9">
          {menu
            .filter((item) => !item.permissao || pode(usuario.perfil, item.permissao))
            .filter((item) => item.href !== "/assinatura" || !carteira.isenta)
            .concat(usuario.superAdmin ? [{ href: "/sistema", label: "Lojas do sistema" }] : [])
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
      </header>
      <main className="mx-auto w-full min-w-0 max-w-screen-2xl flex-1 p-4 md:p-10 print:p-0">
        <AvisoSaldo situacao={carteira.situacao} dias={carteira.diasRestantes} podeRecarregar={podeRecarregar} />
        {children}
      </main>
      <AssistenteIA />
    </div>
  );
}

function AvisoSaldo({ situacao, dias, podeRecarregar }: { situacao: string; dias: number; podeRecarregar: boolean }) {
  let texto: string;
  let tom = "border-amber-300 bg-amber-50 text-amber-900";
  if (situacao === "CONSULTA") {
    texto = "Os créditos do sistema acabaram. Dá para consultar tudo, mas cadastros e vendas ficam bloqueados até a recarga.";
    tom = "border-red-300 bg-red-50 text-red-900";
  } else if (situacao === "TOLERANCIA") {
    texto = "Os créditos do sistema acabaram. Recarregue para não entrar em modo consulta.";
  } else if (situacao === "ATIVA" && dias <= 5) {
    texto = dias === 0 ? "Os créditos do sistema acabam hoje." : `Os créditos do sistema acabam em ${dias} ${dias === 1 ? "dia" : "dias"}.`;
  } else {
    return null;
  }
  return (
    <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm print:hidden ${tom}`}>
      <span>{texto}</span>
      {podeRecarregar ? (
        <Link href="/assinatura" className="font-medium underline">
          Recarregar créditos
        </Link>
      ) : (
        <span className="text-xs">Peça ao administrador para recarregar.</span>
      )}
    </div>
  );
}
