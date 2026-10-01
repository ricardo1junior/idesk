"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSuperAdmin } from "@/lib/auth";
import { randomUUID } from "node:crypto";
import { atualizarCarteira, configSistema, esquecerCarteira, iniciarCarteira, lancarCredito } from "@/lib/carteira";
import { paraNumero } from "@/lib/estoque";
import { somarDias, ymdLocal } from "@/lib/tempo";
import { formatarReais } from "@/lib/vendas";
import type { EstadoFormulario } from "@/lib/clientes";
import { prismaBase, sessaoPorHash } from "@/lib/db";
import { gerarHash } from "@/lib/senha";

const novaLojaSchema = z.object({
  loja: z.string().trim().min(2, "Informe o nome da loja"),
  nome: z.string().trim().min(2, "Informe o nome do administrador"),
  email: z.email("E-mail inválido").transform((v) => v.toLowerCase()),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

// Cria uma loja nova com o primeiro administrador dela (sem acesso às outras lojas).
export async function criarLoja(_e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirSuperAdmin();
  const valores = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const r = novaLojaSchema.safeParse(valores);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, valores: { ...valores, senha: "" } };
  }
  if (await prismaBase.usuario.findUnique({ where: { email: r.data.email } })) {
    return { erros: { email: "Este e-mail já é usado por outro usuário." }, valores: { ...valores, senha: "" } };
  }
  const senhaHash = await gerarHash(r.data.senha);
  const empresa = await prismaBase.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({ data: { nome: r.data.loja } });
    await tx.usuario.create({ data: { empresaId: empresa.id, nome: r.data.nome, email: r.data.email, senhaHash, perfil: "ADMIN" } });
    return empresa;
  });
  await iniciarCarteira(empresa.id);
  revalidatePath("/sistema");
  return { mensagem: `Loja "${r.data.loja}" criada. O administrador já pode entrar com ${r.data.email}.` };
}

export async function alternarLoja(empresaId: string) {
  const eu = await exigirSuperAdmin();
  if (eu.empresaId === empresaId) return; // não bloqueia a própria loja
  const e = await prismaBase.empresa.findUnique({ where: { id: empresaId }, select: { ativa: true } });
  if (!e) return;
  await prismaBase.empresa.update({ where: { id: empresaId }, data: { ativa: !e.ativa } });
  if (e.ativa) {
    // Bloqueada: derruba as sessões abertas dos usuários dela.
    await prismaBase.sessao.deleteMany({ where: { usuario: { empresaId } } });
    sessaoPorHash.limpar();
  }
  revalidatePath("/sistema");
}

const valoresDe = (formData: FormData) => Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
const dinheiro = (v: string | undefined) => (v?.trim() ? paraNumero(v) : NaN);

// Diária própria da loja (vazio = padrão do sistema) e isenção de cobrança.
export async function salvarCobrancaLoja(empresaId: string, _e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirSuperAdmin();
  const valores = valoresDe(formData);
  const diaria = valores.diaria?.trim() ? dinheiro(valores.diaria) : null;
  if (diaria !== null && !(diaria >= 0 && diaria <= 1000)) return { erros: { diaria: "Informe um valor entre 0 e 1.000" }, valores };
  const isenta = valores.isenta === "on";
  // Cobra os dias passados com a diária antiga antes de trocar.
  const antes = await atualizarCarteira(empresaId);
  // Ao voltar a cobrar, começa por hoje: os dias isentos não são cobrados.
  const ontem = new Date(`${somarDias(ymdLocal(new Date()), -1)}T00:00:00Z`);
  await prismaBase.empresa.update({ where: { id: empresaId }, data: { diaria, isenta, ...(antes.isenta && !isenta ? { cobradoAte: ontem } : {}) } });
  esquecerCarteira(empresaId);
  revalidatePath("/sistema", "layout");
  return { mensagem: "Cobrança salva.", valores };
}

// Crédito manual: bônus (positivo) ou ajuste (positivo ou negativo).
export async function lancarCreditoManual(empresaId: string, _e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const eu = await exigirSuperAdmin();
  const valores = valoresDe(formData);
  const valor = dinheiro(valores.valor);
  const tipo = valores.tipo === "BONUS" ? "BONUS" : "AJUSTE";
  if (!Number.isFinite(valor) || valor === 0 || Math.abs(valor) > 100000) return { erros: { valor: "Informe um valor diferente de zero" }, valores };
  if (tipo === "BONUS" && valor < 0) return { erros: { valor: "Bônus precisa ser positivo; use ajuste para descontar" }, valores };
  const descricao = valores.descricao?.trim() || (tipo === "BONUS" ? "Bônus" : "Ajuste manual");
  await lancarCredito(empresaId, { tipo, valor, descricao, referencia: `manual:${randomUUID()}`, usuarioId: eu.id });
  revalidatePath("/sistema", "layout");
  return { mensagem: `${tipo === "BONUS" ? "Bônus" : "Ajuste"} de ${formatarReais(valor)} lançado.` };
}

// Valores padrão da cobrança de todas as lojas.
export async function salvarConfigSistema(_e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirSuperAdmin();
  const valores = valoresDe(formData);
  const diariaPadrao = dinheiro(valores.diariaPadrao);
  const creditoBoasVindas = dinheiro(valores.creditoBoasVindas);
  const recargaMinima = dinheiro(valores.recargaMinima);
  const diasTolerancia = Number(valores.diasTolerancia);
  const erros: Record<string, string> = {};
  if (!(diariaPadrao >= 0 && diariaPadrao <= 1000)) erros.diariaPadrao = "Valor inválido";
  if (!(creditoBoasVindas >= 0 && creditoBoasVindas <= 10000)) erros.creditoBoasVindas = "Valor inválido";
  if (!(recargaMinima >= 5 && recargaMinima <= 10000)) erros.recargaMinima = "Mínimo de R$ 5,00";
  if (!(Number.isInteger(diasTolerancia) && diasTolerancia >= 0 && diasTolerancia <= 60)) erros.diasTolerancia = "Entre 0 e 60 dias";
  if (Object.keys(erros).length) return { erros, valores };
  const dados = { diariaPadrao, creditoBoasVindas, recargaMinima, diasTolerancia };
  await prismaBase.configSistema.upsert({ where: { id: "sistema" }, create: { id: "sistema", ...dados }, update: dados });
  configSistema.esquecer();
  revalidatePath("/sistema", "layout");
  return { mensagem: "Valores salvos.", valores };
}
