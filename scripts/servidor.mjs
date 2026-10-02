// Roda o iDesk neste computador para ser aberto por qualquer aparelho da mesma rede (Wi-Fi ou cabo).
// Uso: npm run servidor        (compila e inicia)
//      npm run servidor -- --sem-compilar   (inicia a última versão compilada, mais rápido)
import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { hostname, networkInterfaces } from "node:os";

const PORTA = process.env.PORT || "3000";

if (!existsSync(".env")) {
  console.log("\n✗ Falta o arquivo .env. Rode primeiro:  npm run configurar\n");
  process.exit(1);
}

const semCompilar = process.argv.includes("--sem-compilar") && existsSync(".next/BUILD_ID");
if (!semCompilar) {
  console.log("\nAtualizando as tabelas do banco...\n");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  console.log("\nCompilando o iDesk (leva um ou dois minutos)...\n");
  execSync("npx next build", { stdio: "inherit" });
}

// Endereços IPv4 desta máquina na rede local (ignora o 127.0.0.1).
const enderecos = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i.address);

const servidor = spawn("npx", ["next", "start", "-H", "0.0.0.0", "-p", PORTA], {
  stdio: ["inherit", "ignore", "inherit"],
  env: { ...process.env, IDESK_REDE_LOCAL: "1" },
});

// No Mac, impede que o computador durma enquanto o servidor estiver ligado.
if (process.platform === "darwin") {
  spawn("caffeinate", ["-i", "-w", String(servidor.pid)], { stdio: "ignore" }).on("error", () => {});
}

const nome = hostname().replace(/\.local$/, "");
console.log("\n✓ iDesk ligado. Abra em qualquer aparelho conectado à mesma rede:\n");
for (const ip of enderecos) console.log(`   http://${ip}:${PORTA}`);
if (process.platform === "darwin") console.log(`   http://${nome}.local:${PORTA}`);
console.log(`\nNeste computador: http://localhost:${PORTA}`);
console.log("Se o Mac perguntar se aceita conexões de entrada, clique em Permitir.");
console.log("Para desligar, aperte Ctrl+C nesta janela.\n");

for (const sinal of ["SIGINT", "SIGTERM"]) process.on(sinal, () => servidor.kill(sinal));
servidor.on("exit", (codigo) => process.exit(codigo ?? 0));
