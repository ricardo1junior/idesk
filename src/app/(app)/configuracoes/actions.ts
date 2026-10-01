"use server";

import { revalidatePath } from "next/cache";
import { configLojaSchema } from "@/lib/agenda";
import { exigirUsuario } from "@/lib/auth";
import type { EstadoFormulario } from "@/lib/clientes";
import { criptografar } from "@/lib/cripto";
import { empresaAtualId, prisma } from "@/lib/db";
import { dadosLojaSchema, MAX_BYTES_LOGO } from "@/lib/empresa-dados";
import { tipoImagem } from "@/lib/fotos";

export async function salvarConfigLoja(_e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirUsuario("configuracoes");
  const valores = Object.fromEntries([...formData.entries()].filter(([k]) => k !== "diasSemana").map(([k, v]) => [k, String(v)]));
  const r = configLojaSchema.safeParse({ ...valores, diasSemana: formData.getAll("diasSemana") });
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, valores };
  }
  const anterior = await prisma.lojaConfig.findFirst({ select: { endereco: true } });
  // Endereço mudou: as coordenadas guardadas deixam de valer.
  const coordenadas = anterior?.endereco !== r.data.endereco ? { latitude: null, longitude: null } : {};
  await prisma.lojaConfig.upsert({ where: { empresaId: await empresaAtualId() }, create: r.data, update: { ...r.data, ...coordenadas } });
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
  return { mensagem: `Salvo às ${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}` };
}

export async function salvarDadosLoja(_e: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirUsuario("configuracoes");
  const valores = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]));
  const r = dadosLojaSchema.safeParse(valores);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, valores: { ...valores, smtpSenha: "" } };
  }
  const { smtpSenha, ...dados } = r.data;
  // Senha em branco mantém a atual; guardada criptografada.
  await prisma.empresa.update({
    where: { id: await empresaAtualId() },
    data: { ...dados, ...(smtpSenha ? { smtpSenha: criptografar(smtpSenha) } : {}) },
  });
  revalidatePath("/", "layout");
  return { mensagem: `Salvo às ${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}` };
}

export async function enviarLogo(formData: FormData): Promise<{ erro?: string }> {
  await exigirUsuario("configuracoes");
  const arquivo = formData.get("logo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma imagem." };
  if (arquivo.size > MAX_BYTES_LOGO) return { erro: "Logo muito grande (máximo 500 KB)." };
  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const tipo = tipoImagem(dados);
  if (!tipo) return { erro: "Formato não suportado. Use PNG, JPG ou WEBP." };
  await prisma.empresa.update({ where: { id: await empresaAtualId() }, data: { logo: dados, logoTipo: tipo, logoVersao: { increment: 1 } } });
  revalidatePath("/", "layout");
  return {};
}

export async function removerLogo() {
  await exigirUsuario("configuracoes");
  await prisma.empresa.update({ where: { id: await empresaAtualId() }, data: { logo: null, logoTipo: null, logoVersao: { increment: 1 } } });
  revalidatePath("/", "layout");
}
