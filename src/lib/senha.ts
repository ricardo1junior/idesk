import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Hash de senhas de usuários do sistema com scrypt. Formato: scrypt$salt$hash (base64).
const scryptAsync = promisify(scrypt) as (senha: string, salt: Buffer, tamanho: number) => Promise<Buffer>;

export async function gerarHash(senha: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(senha, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function conferirSenha(senha: string, armazenado: string): Promise<boolean> {
  const [algoritmo, salt, hash] = armazenado.split("$");
  if (algoritmo !== "scrypt" || !salt || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const calculado = await scryptAsync(senha, Buffer.from(salt, "base64"), esperado.length);
  return timingSafeEqual(esperado, calculado);
}
