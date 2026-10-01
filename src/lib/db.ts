import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma, PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { cache } from "react";
import { COOKIE_SESSAO } from "./auth-cookie";
import { hashToken } from "./sessao-token";

// Reaproveita a conexão entre recarregamentos do servidor de desenvolvimento.
const globalForPrisma = globalThis as unknown as { prismaBase?: PrismaClient };
const base = globalForPrisma.prismaBase ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prismaBase = base;

/**
 * Cliente sem filtro de loja. Use só onde a loja ainda não é conhecida ou onde o acesso é
 * entre lojas: login, sessão, primeiro acesso e o painel do dono do sistema.
 */
export const prismaBase = base;

// ---------- Loja da requisição ----------

const lojaForcada = new AsyncLocalStorage<string>();

/** Roda `fn` como se estivesse logado na loja `empresaId` (painel do dono, scripts). */
export function comEmpresa<T>(empresaId: string, fn: () => Promise<T>): Promise<T> {
  return lojaForcada.run(empresaId, fn);
}

/** Loja do usuário logado nesta requisição, ou null. Memorizado por requisição. */
export const empresaDaSessao = cache(async (): Promise<string | null> => {
  let token: string | undefined;
  try {
    token = (await cookies()).get(COOKIE_SESSAO)?.value;
  } catch {
    return null; // fora de uma requisição
  }
  if (!token) return null;
  const sessao = await base.sessao.findUnique({
    where: { id: hashToken(token) },
    select: { expiraEm: true, usuario: { select: { empresaId: true, ativo: true } } },
  });
  if (!sessao || sessao.expiraEm < new Date() || !sessao.usuario.ativo) return null;
  const empresa = await base.empresa.findUnique({ where: { id: sessao.usuario.empresaId }, select: { ativa: true } });
  return empresa?.ativa ? sessao.usuario.empresaId : null;
});

export async function empresaAtualId(): Promise<string> {
  const id = lojaForcada.getStore() ?? (await empresaDaSessao());
  if (!id) throw new Error("Nenhuma loja definida para acessar os dados.");
  return id;
}

// ---------- Separação dos dados por loja ----------

const modelos = Prisma.dmmf.datamodel.models;
// Tabelas com empresaId (Contador é tratado à parte).
const DA_LOJA = new Set(modelos.filter((m) => m.name !== "Contador" && m.fields.some((f) => f.name === "empresaId")).map((m) => m.name));
// Campos de relação de cada tabela: nome do campo -> tabela de destino.
const RELACOES = new Map(modelos.map((m) => [m.name, m.fields.filter((f) => f.kind === "object").map((f) => [f.name, f.type] as const)]));
// Números sequenciais por loja (OS #1, Venda #1...).
const NUMERADOS: Record<string, string> = { OrdemServico: "os", Venda: "venda", Entrega: "entrega" };

type Dados = Record<string, unknown>;

/** Próximo número da loja, atômico mesmo com vendas simultâneas. */
export async function proximoNumero(empresaId: string, chave: string): Promise<number> {
  const [linha] = await base.$queryRaw<{ valor: number }[]>`
    INSERT INTO "Contador" ("empresaId", "chave", "valor") VALUES (${empresaId}, ${chave}, 1)
    ON CONFLICT ("empresaId", "chave") DO UPDATE SET "valor" = "Contador"."valor" + 1
    RETURNING "valor"`;
  return linha.valor;
}

// Preenche empresaId num registro novo e nos registros criados junto com ele.
async function preencher(modelo: string, dados: unknown, empresaId: string): Promise<unknown> {
  if (!dados || typeof dados !== "object") return dados;
  const d: Dados = { ...(dados as Dados) };
  if (DA_LOJA.has(modelo)) d.empresaId = empresaId;
  if (NUMERADOS[modelo] && d.numero == null) d.numero = await proximoNumero(empresaId, NUMERADOS[modelo]);
  await aninhados(modelo, d, empresaId);
  return d;
}

async function preencherLista(modelo: string, v: unknown, empresaId: string) {
  return Array.isArray(v) ? Promise.all(v.map((x) => preencher(modelo, x, empresaId))) : preencher(modelo, v, empresaId);
}

// Percorre as escritas aninhadas (create, upsert, update...) dentro de `d`.
async function aninhados(modelo: string, d: Dados, empresaId: string) {
  for (const [campo, destino] of RELACOES.get(modelo) ?? []) {
    const op = d[campo];
    if (!op || typeof op !== "object" || Array.isArray(op)) continue;
    const n: Dados = { ...(op as Dados) };
    if (n.create) n.create = await preencherLista(destino, n.create, empresaId);
    if (n.createMany && typeof n.createMany === "object") {
      const cm = n.createMany as Dados;
      n.createMany = { ...cm, data: await preencherLista(destino, cm.data, empresaId) };
    }
    if (n.connectOrCreate) {
      n.connectOrCreate = await Promise.all(
        ([] as Dados[]).concat(n.connectOrCreate as Dados).map(async (c) => ({ ...c, create: await preencher(destino, c.create, empresaId) })),
      );
    }
    if (n.upsert) {
      n.upsert = await Promise.all(
        ([] as Dados[]).concat(n.upsert as Dados).map(async (u) => ({
          ...u,
          create: await preencher(destino, u.create, empresaId),
          update: await atualizar(destino, u.update, empresaId),
        })),
      );
      if (!Array.isArray(op) && !Array.isArray((op as Dados).upsert)) n.upsert = (n.upsert as unknown[])[0];
    }
    if (n.update) {
      n.update = await Promise.all(
        ([] as Dados[]).concat(n.update as Dados).map(async (u) => (u && "data" in u ? { ...u, data: await atualizar(destino, u.data, empresaId) } : atualizar(destino, u, empresaId))),
      );
      if (!Array.isArray((op as Dados).update)) n.update = (n.update as unknown[])[0];
    }
    d[campo] = n;
  }
}

async function atualizar(modelo: string, dados: unknown, empresaId: string) {
  if (!dados || typeof dados !== "object") return dados;
  const d: Dados = { ...(dados as Dados) };
  delete d.empresaId; // registro nunca muda de loja
  await aninhados(modelo, d, empresaId);
  return d;
}

const COM_WHERE = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy",
  "update", "updateMany", "updateManyAndReturn", "delete", "deleteMany", "upsert",
]);

/**
 * Cliente usado pelo sistema: toda consulta enxerga só a loja do usuário logado e todo
 * registro novo nasce com o empresaId dela.
 */
export const prisma = base.$extends({
  name: "separacao-por-loja",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!DA_LOJA.has(model)) return query(args);
        const empresaId = await empresaAtualId();
        const a = { ...(args as Dados) };
        if (COM_WHERE.has(operation)) a.where = { ...((a.where as Dados) ?? {}), empresaId };
        if (operation === "create") a.data = await preencher(model, a.data, empresaId);
        if (operation === "createMany" || operation === "createManyAndReturn") a.data = await preencherLista(model, a.data, empresaId);
        if (operation === "update" || operation === "updateMany" || operation === "updateManyAndReturn") a.data = await atualizar(model, a.data, empresaId);
        if (operation === "upsert") {
          a.create = await preencher(model, a.create, empresaId);
          a.update = await atualizar(model, a.update, empresaId);
        }
        return query(a as typeof args);
      },
    },
  },
});

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
