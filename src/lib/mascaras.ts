// Máscaras dos campos de digitação (aplicadas enquanto a pessoa digita) e as validações
// equivalentes usadas no servidor. Funções puras: rodam no navegador e no servidor.

import { z } from "zod";
import { somenteDigitos } from "./documentos";

export type TipoMascara =
  | "nome" // pessoa: só letras, espaço, apóstrofo, ponto e hífen
  | "cidade"
  | "telefone"
  | "email"
  | "cpf"
  | "cnpj"
  | "documento" // CPF ou CNPJ, conforme a quantidade de dígitos
  | "cep"
  | "uf"
  | "imei"
  | "serial"
  | "dinheiro"
  | "inteiro"
  | "ncm"
  | "rg"
  | "inscricao"; // inscrição estadual/municipal: dígitos ou ISENTO

const NAO_NOME = /[^\p{L}\s'.-]/gu;

function agrupar(digitos: string, partes: number[], separadores: string[]) {
  let saida = "";
  let pos = 0;
  partes.forEach((tam, i) => {
    const pedaco = digitos.slice(pos, pos + tam);
    if (!pedaco) return;
    if (i > 0) saida += separadores[i - 1];
    saida += pedaco;
    pos += tam;
  });
  return saida;
}

export function mascararTelefone(v: string) {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  const resto = d.slice(2);
  // Celular (9 dígitos) ou fixo (8 dígitos).
  const corte = d.length === 11 ? 5 : 4;
  return resto.length > corte ? `(${d.slice(0, 2)}) ${resto.slice(0, corte)}-${resto.slice(corte)}` : `(${d.slice(0, 2)}) ${resto}`;
}

export const mascararCpf = (v: string) => agrupar(somenteDigitos(v).slice(0, 11), [3, 3, 3, 2], [".", ".", "-"]);
export const mascararCnpj = (v: string) => agrupar(somenteDigitos(v).slice(0, 14), [2, 3, 3, 4, 2], [".", ".", "/", "-"]);
export const mascararDocumento = (v: string) => (somenteDigitos(v).length > 11 ? mascararCnpj(v) : mascararCpf(v));
export const mascararCep = (v: string) => agrupar(somenteDigitos(v).slice(0, 8), [5, 3], ["-"]);

export function aplicarMascara(tipo: TipoMascara, v: string): string {
  switch (tipo) {
    case "nome":
    case "cidade":
      return v.replace(NAO_NOME, "").replace(/\s{2,}/g, " ").replace(/^\s+/, "");
    case "telefone":
      return mascararTelefone(v);
    case "email":
      return v.replace(/\s/g, "").toLowerCase();
    case "cpf":
      return mascararCpf(v);
    case "cnpj":
      return mascararCnpj(v);
    case "documento":
      return mascararDocumento(v);
    case "cep":
      return mascararCep(v);
    case "uf":
      return v.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
    case "imei":
      return somenteDigitos(v).slice(0, 15);
    case "serial":
      return v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 20);
    case "dinheiro":
      return v.replace(/[^\d.,]/g, "");
    case "inteiro":
      return somenteDigitos(v);
    case "ncm":
      return somenteDigitos(v).slice(0, 8);
    case "rg":
      return v.replace(/[^\dxX.-]/g, "").toUpperCase().slice(0, 14);
    case "inscricao":
      return /^[iI]/.test(v.trim()) ? v.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 6) : v.replace(/[^\d.\-/]/g, "").slice(0, 20);
  }
}

// ---------- Validações (servidor) ----------

export const nomeValido = (v: string) => /^\p{L}[\p{L}\s'.-]*\p{L}\.?$/u.test(v.trim()) && v.trim().length >= 2;

// DDD de 11 a 99; celular com 11 dígitos começa com 9; fixo com 10 dígitos começa de 2 a 5.
export function telefoneValido(v: string) {
  const d = somenteDigitos(v);
  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11 || d[1] === "0") return false;
  return d.length === 11 ? d[2] === "9" : /[2-5]/.test(d[2]);
}

export const emailValido = (v: string) => z.email().safeParse(v.trim()).success;
export const cepValido = (v: string) => somenteDigitos(v).length === 8;

// IMEI: 15 dígitos com dígito verificador (algoritmo de Luhn).
export function imeiValido(v: string) {
  if (!/^\d{15}$/.test(v)) return false;
  const soma = [...v].reduce((acc, c, i) => {
    let n = Number(c);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    return acc + n;
  }, 0);
  return soma % 10 === 0;
}

// Campos zod prontos para os formulários (texto vazio vira null).
const vazioNulo = (v: string) => (v === "" ? null : v);

export const campoNome = (rotulo = "o nome") =>
  z
    .string()
    .trim()
    .min(2, `Informe ${rotulo}`)
    .refine(nomeValido, "Use só letras (sem números ou símbolos)");

export const campoEmailOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => !v || emailValido(v), "E-mail inválido")
  .transform(vazioNulo)
  .nullable()
  .optional();

export const campoTelefoneOpcional = z
  .string()
  .trim()
  .refine((v) => !v || telefoneValido(v), "Telefone inválido: DDD + número, só dígitos")
  .transform((v) => (v ? somenteDigitos(v) : null))
  .nullable()
  .optional();

export const campoCepOpcional = z
  .string()
  .trim()
  .refine((v) => !v || cepValido(v), "CEP deve ter 8 dígitos")
  .transform((v) => (v ? somenteDigitos(v) : null))
  .nullable()
  .optional();

export const campoUfOpcional = z
  .string()
  .trim()
  .refine((v) => !v || /^[a-zA-Z]{2}$/.test(v), "UF com 2 letras")
  .transform((v) => (v ? v.toUpperCase() : null))
  .nullable()
  .optional();
