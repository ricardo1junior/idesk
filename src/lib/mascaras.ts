// Máscaras aplicadas enquanto o usuário digita e validações dos mesmos campos no servidor.
// Sem "server-only": usado nos formulários e nos schemas.
import { z } from "zod";
import { somenteDigitos } from "./documentos";

// ---------- Máscaras (formatam o que já foi digitado, sem completar) ----------

export function mascaraTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const meio = d.length === 11 ? 7 : 6;
  if (d.length <= meio) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, meio)}-${d.slice(meio)}`;
}

export function mascaraCpf(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function mascaraCnpj(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/\/(\d{4})(\d{1,2})$/, "/$1-$2");
}

/** CPF até 11 dígitos; a partir do 12º vira CNPJ. */
export function mascaraCpfCnpj(valor: string): string {
  return somenteDigitos(valor).length > 11 ? mascaraCnpj(valor) : mascaraCpf(valor);
}

export function mascaraCep(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export const mascaraDigitos = (max: number) => (valor: string) => somenteDigitos(valor).slice(0, max);
export const mascaraImei = mascaraDigitos(15);

/** Nomes de pessoa: tira números e símbolos, mantém letras (com acento), espaço, apóstrofo, hífen e ponto. */
export function mascaraNome(valor: string): string {
  return valor.replace(/[^\p{L}\p{M}\s'’.-]/gu, "").replace(/^\s+/, "").replace(/\s{2,}/g, " ");
}

/** Número de série da Apple: letras e números, em maiúsculas. */
export function mascaraSerial(valor: string): string {
  return valor.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 20);
}

export function mascaraUf(valor: string): string {
  return valor.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
}

/** Valores em reais: só dígitos, vírgula e ponto (a leitura fica com lerReais). */
export function mascaraDinheiro(valor: string): string {
  return valor.replace(/[^\d.,]/g, "");
}

/** Valor que pode ser negativo (ajustes): o "-" só vale no começo. */
export function mascaraDinheiroComSinal(valor: string): string {
  const t = valor.trim();
  return (t.startsWith("-") ? "-" : "") + mascaraDinheiro(t);
}

/** Desconto em reais ou em porcentagem ("10%"). */
export function mascaraDesconto(valor: string): string {
  return valor.replace(/[^\d.,%]/g, "").replace(/%(?=.)/g, "");
}

export function mascaraEmail(valor: string): string {
  return valor.replace(/\s/g, "").toLowerCase();
}

// ---------- Validações ----------

/** Telefone brasileiro com DDD: fixo (10 dígitos) ou celular (11 dígitos, começando com 9). */
export function telefoneValido(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (!/^[1-9][1-9]/.test(d)) return false;
  if (d.length === 11) return d[2] === "9";
  return d.length === 10 && /[2-9]/.test(d[2]);
}

export function nomeValido(valor: string): boolean {
  return /^[\p{L}\p{M}][\p{L}\p{M}\s'’.-]*$/u.test(valor.trim());
}

export function emailValido(valor: string): boolean {
  return z.email().safeParse(valor.trim()).success;
}

export function cepValido(valor: string): boolean {
  return /^\d{8}$/.test(somenteDigitos(valor)) && somenteDigitos(valor) !== "00000000";
}

/** IMEI: 15 dígitos com o dígito verificador (Luhn) correto. */
export function imeiValido(valor: string): boolean {
  if (!/^\d{15}$/.test(valor)) return false;
  let soma = 0;
  for (let i = 0; i < 15; i++) {
    let n = Number(valor[i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
  }
  return soma % 10 === 0;
}

export function serialValido(valor: string): boolean {
  return /^[A-Z0-9]{8,20}$/.test(valor);
}

// ---------- Schemas zod reaproveitados nos formulários ----------

// Campo ausente ou nulo vale como vazio.
const entrada = z
  .string()
  .nullish()
  .transform((v) => (v ?? "").trim());

export const nomePessoa = (mensagem = "Informe o nome") =>
  z
    .string()
    .trim()
    .min(2, mensagem)
    .refine(nomeValido, "O nome não pode ter números nem símbolos")
    .transform((v) => v.replace(/\s{2,}/g, " "));

export const telefoneOpcional = (mensagem = "Telefone inválido. Use DDD + número, ex.: (11) 99999-9999") =>
  entrada
    .transform(somenteDigitos)
    .refine((v) => !v || telefoneValido(v), mensagem)
    .transform((v) => v || null);

export const emailOpcional = (mensagem = "E-mail inválido") =>
  entrada
    .transform((v) => v.toLowerCase())
    .refine((v) => !v || emailValido(v), mensagem)
    .transform((v) => v || null);

export const imeiOpcional = (rotulo = "IMEI") =>
  entrada
    .transform(somenteDigitos)
    .refine((v) => !v || v.length === 15, `${rotulo} deve ter 15 dígitos`)
    .refine((v) => v.length !== 15 || imeiValido(v), `${rotulo} inválido, confira os números`)
    .transform((v) => v || null);

export const serialOpcional = entrada
  .transform(mascaraSerial)
  .refine((v) => !v || serialValido(v), "Número de série deve ter de 8 a 20 letras e números")
  .transform((v) => v || null);
