// Configuração guiada para rodar o iDesk no computador: pede a conexão do banco, cria o .env e prepara as tabelas.
// Uso: npm run configurar
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const atual = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const lerAtual = (nome) => atual.match(new RegExp(`^${nome}\\s*=\\s*"?([^"\\n]*)"?`, "m"))?.[1] ?? "";

console.log("\nConfiguração do iDesk\n");
console.log('Na Neon, clique em "Connect" e copie a linha de conexão (pode colar do jeito que vier).');
let texto = await rl.question("\nCole aqui a conexão e aperte Enter:\n> ");
let url = texto.match(/postgres(?:ql)?:\/\/[^\s'"]+/)?.[0];
while (!url) {
  texto = await rl.question('\nNão encontrei uma conexão (ela começa com "postgresql://"). Cole de novo:\n> ');
  url = texto.match(/postgres(?:ql)?:\/\/[^\s'"]+/)?.[0];
}
rl.close();

// Na Neon, a conexão "pooled" tem "-pooler" no endereço; a direta é a mesma sem isso.
const direta = url.replace("-pooler.", ".");
const segredo = lerAtual("APP_SECRET") || randomBytes(32).toString("base64");

const manter = atual
  .split("\n")
  .filter((l) => l.trim() && !/^(DATABASE_URL|DIRECT_URL|APP_SECRET)\s*=/.test(l))
  .join("\n");
writeFileSync(".env", `DATABASE_URL="${url}"\nDIRECT_URL="${direta}"\nAPP_SECRET="${segredo}"\n${manter ? `${manter}\n` : ""}`);
console.log("\n✓ Arquivo .env criado.");

console.log("\nPreparando as tabelas do banco (pode levar alguns segundos)...\n");
try {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} catch {
  console.log("\n✗ Não consegui acessar o banco. Confira se copiou a conexão inteira da Neon e rode de novo: npm run configurar");
  process.exit(1);
}
console.log('\n✓ Tudo pronto! Agora rode:  npm run dev   e abra http://localhost:3000\n');
