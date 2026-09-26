import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Criptografia simétrica (AES-256-GCM) para dados sensíveis, como a senha do aparelho do cliente.
// Formato salvo: base64(iv).base64(tag).base64(conteúdo)

function chave(): Buffer {
  const segredo = process.env.APP_SECRET;
  if (!segredo) throw new Error("APP_SECRET não configurado no .env");
  return createHash("sha256").update(segredo).digest();
}

export function criptografar(texto: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chave(), iv);
  const conteudo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return [iv, cifra.getAuthTag(), conteudo].map((b) => b.toString("base64")).join(".");
}

export function descriptografar(valor: string): string {
  const [iv, tag, conteudo] = valor.split(".").map((p) => Buffer.from(p, "base64"));
  const decifra = createDecipheriv("aes-256-gcm", chave(), iv);
  decifra.setAuthTag(tag);
  return Buffer.concat([decifra.update(conteudo), decifra.final()]).toString("utf8");
}
