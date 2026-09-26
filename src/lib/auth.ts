import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { Usuario } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";
import { pode, type Permissao } from "./permissoes";

import { COOKIE_SESSAO } from "./auth-cookie";

export { COOKIE_SESSAO };
const DURACAO_MS = 12 * 60 * 60 * 1000; // 12 horas

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function criarSessao(usuarioId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + DURACAO_MS);
  await prisma.sessao.create({ data: { id: hashToken(token), usuarioId, expiraEm } });
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiraEm,
  });
}

export async function encerrarSessao() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (token) await prisma.sessao.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(COOKIE_SESSAO);
}

export type UsuarioSessao = Pick<Usuario, "id" | "nome" | "email" | "perfil">;

// Usuário logado nesta requisição (ou null). Memorizado por requisição.
export const usuarioAtual = cache(async (): Promise<UsuarioSessao | null> => {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const sessao = await prisma.sessao.findUnique({
    where: { id: hashToken(token) },
    include: { usuario: { select: { id: true, nome: true, email: true, perfil: true, ativo: true } } },
  });
  if (!sessao || sessao.expiraEm < new Date() || !sessao.usuario.ativo) return null;
  const { id, nome, email, perfil } = sessao.usuario;
  return { id, nome, email, perfil };
});

// Use no início de páginas e server actions protegidas.
export async function exigirUsuario(permissao?: Permissao): Promise<UsuarioSessao> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (permissao && !pode(usuario.perfil, permissao)) redirect("/sem-permissao");
  return usuario;
}
