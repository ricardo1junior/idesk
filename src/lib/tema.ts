export type Tema = "claro" | "escuro" | "auto";

export function lerTema(valor: string | undefined): Tema {
  return valor === "claro" || valor === "escuro" ? valor : "auto";
}
