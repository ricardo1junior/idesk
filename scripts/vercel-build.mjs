// Build da Vercel: aplica as migrações do banco e gera o site.
// Sem DIRECT_URL, usa a DATABASE_URL_UNPOOLED (criada pela integração Neon da Vercel)
// ou a própria DATABASE_URL sem o "-pooler" do endereço (a conexão direta da Neon).
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Falta a variável DATABASE_URL (conexão do banco). Cadastre em Settings › Environment Variables na Vercel.");
  process.exit(1);
}
const env = { ...process.env };
if (!env.DIRECT_URL?.trim()) {
  env.DIRECT_URL = env.DATABASE_URL_UNPOOLED?.trim() || url.replace("-pooler.", ".");
  console.log("DIRECT_URL não definida: usando a conexão direta derivada da DATABASE_URL.");
}
execSync("prisma migrate deploy", { stdio: "inherit", env });
execSync("next build", { stdio: "inherit", env });
