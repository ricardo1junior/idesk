import type { Perfil } from "@prisma/client";

export const PERFIS: Record<Perfil, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  TECNICO: "Técnico",
  FINANCEIRO: "Financeiro",
  ESTAGIARIO: "Estagiário",
};

// O que cada perfil pode fazer. ADMIN pode tudo.
const REGRAS = {
  clientes: ["VENDEDOR", "TECNICO", "FINANCEIRO", "ESTAGIARIO"],
  excluirCliente: [],
  os: ["VENDEDOR", "TECNICO", "ESTAGIARIO"],
  editarOS: ["VENDEDOR", "TECNICO"],
  receberOS: ["VENDEDOR", "TECNICO"],
  verSenhaAparelho: ["TECNICO"],
  verificarImei: ["VENDEDOR", "TECNICO", "FINANCEIRO"],
  vendas: ["VENDEDOR", "FINANCEIRO"],
  cancelarVenda: ["FINANCEIRO"],
  estoque: ["VENDEDOR", "FINANCEIRO", "TECNICO", "ESTAGIARIO"],
  editarProdutos: ["FINANCEIRO"],
  financeiro: ["FINANCEIRO"],
  notasFiscais: ["FINANCEIRO"],
  emitirNota: ["FINANCEIRO", "VENDEDOR"],
  agenda: ["VENDEDOR", "TECNICO", "FINANCEIRO", "ESTAGIARIO"],
  entregas: ["VENDEDOR", "TECNICO", "FINANCEIRO", "ESTAGIARIO"],
  configuracoes: [],
  usuarios: [],
  assinatura: ["FINANCEIRO"],
} satisfies Record<string, Perfil[]>;

export type Permissao = keyof typeof REGRAS;

// Texto de cada permissão, na ordem em que aparece na tabela da tela de usuários.
export const DESCRICAO_PERMISSOES: Record<Permissao, string> = {
  clientes: "Ver e cadastrar clientes",
  excluirCliente: "Excluir clientes",
  os: "Abrir e acompanhar ordens de serviço",
  editarOS: "Orçamento da OS (serviços, peças, desconto) e mudar status",
  receberOS: "Registrar pagamento da OS",
  verSenhaAparelho: "Ver a senha do aparelho",
  verificarImei: "Consultar IMEI (consulta paga)",
  vendas: "Fazer vendas",
  cancelarVenda: "Cancelar vendas e notas fiscais",
  estoque: "Consultar estoque",
  editarProdutos: "Cadastrar produtos, preços e movimentar estoque",
  financeiro: "Financeiro e fluxo de caixa",
  notasFiscais: "Importar XML e dados fiscais",
  emitirNota: "Emitir nota fiscal da venda",
  agenda: "Agenda de atendimentos",
  entregas: "Entregas e coletas",
  configuracoes: "Configurações da loja (dados, logo, e-mail e horários)",
  usuarios: "Gerenciar usuários",
  assinatura: "Ver saldo e recarregar créditos do sistema",
};

export function pode(perfil: Perfil, permissao: Permissao): boolean {
  return perfil === "ADMIN" || (REGRAS[permissao] as Perfil[]).includes(perfil);
}
