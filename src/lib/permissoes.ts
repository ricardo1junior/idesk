import type { Perfil } from "@prisma/client";

export const PERFIS: Record<Perfil, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  TECNICO: "Técnico",
  FINANCEIRO: "Financeiro",
};

// O que cada perfil pode fazer. ADMIN pode tudo.
const REGRAS = {
  clientes: ["VENDEDOR", "TECNICO", "FINANCEIRO"],
  excluirCliente: [],
  os: ["VENDEDOR", "TECNICO"],
  verSenhaAparelho: ["TECNICO"],
  vendas: ["VENDEDOR", "FINANCEIRO"],
  cancelarVenda: ["FINANCEIRO"],
  estoque: ["VENDEDOR", "FINANCEIRO", "TECNICO"],
  editarProdutos: ["FINANCEIRO"],
  financeiro: ["FINANCEIRO"],
  notasFiscais: ["FINANCEIRO"],
  emitirNota: ["FINANCEIRO", "VENDEDOR"],
  usuarios: [],
} satisfies Record<string, Perfil[]>;

export type Permissao = keyof typeof REGRAS;

export function pode(perfil: Perfil, permissao: Permissao): boolean {
  return perfil === "ADMIN" || (REGRAS[permissao] as Perfil[]).includes(perfil);
}
