import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "iDesk",
  description: "Vendas, ordens de serviço, estoque e notas fiscais",
};

const menu = [
  { href: "/", label: "Início" },
  { href: "/clientes", label: "Clientes" },
  { href: "/os", label: "Ordens de serviço" },
  { href: "#", label: "Vendas", embreve: true },
  { href: "#", label: "Estoque", embreve: true },
  { href: "#", label: "Notas fiscais", embreve: true },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col md:flex-row">
        <aside className="print:hidden border-b border-zinc-200 bg-white md:w-56 md:border-r md:border-b-0">
          <div className="px-5 py-4 text-lg font-bold tracking-tight">iDesk</div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 text-sm md:flex-col">
            {menu.map((item) =>
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
        </aside>
        <main className="flex-1 p-4 md:p-8 print:p-0">{children}</main>
      </body>
    </html>
  );
}
