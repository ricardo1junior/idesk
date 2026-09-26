export const TEMAS = { claro: "Claro", escuro: "Escuro", auto: "Automático" } as const;
export type Tema = keyof typeof TEMAS;

export function lerTema(valor: string | undefined): Tema {
  return valor === "claro" || valor === "escuro" ? valor : "auto";
}
