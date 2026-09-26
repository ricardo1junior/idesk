"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ItemMenu({ href, children }: { href: string; children: React.ReactNode }) {
  const caminho = usePathname();
  const ativo = href === "/" ? caminho === "/" : caminho === href || caminho.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`whitespace-nowrap rounded-lg px-3 py-2 transition ${ativo ? "bg-zinc-900/[0.07] font-medium text-zinc-900" : "text-zinc-600 hover:bg-zinc-900/[0.04] hover:text-zinc-900"}`}
    >
      {children}
    </Link>
  );
}
