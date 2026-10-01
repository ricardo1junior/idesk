import "server-only";
import nodemailer from "nodemailer";
import { descriptografar } from "@/lib/cripto";
import { empresaAtualId, prisma } from "@/lib/db";
import { empresaAtual } from "@/lib/empresa";

// Envio de e-mails pelo SMTP da loja ou do servidor (Gmail, Outlook, Zoho, provedor do domínio etc.).

type ConfigSmtp = { host: string; porta: number; seguro: boolean; usuario?: string; senha?: string; remetente: string; resposta?: string };

// SMTP da própria loja (Configurações) ou, se ela não tiver, o do servidor (.env).
async function configSmtp(): Promise<ConfigSmtp | null> {
  const e = await empresaAtual();
  if (e.smtpHost && e.emailRemetente) {
    const porta = e.smtpPorta ?? 587;
    return {
      host: e.smtpHost,
      porta,
      seguro: e.smtpSeguro || porta === 465,
      usuario: e.smtpUsuario ?? undefined,
      senha: e.smtpSenha ? descriptografar(e.smtpSenha) : undefined,
      remetente: e.emailRemetente,
      resposta: e.email ?? undefined,
    };
  }
  if (!process.env.SMTP_HOST || !process.env.EMAIL_REMETENTE) return null;
  const porta = Number(process.env.SMTP_PORT || 587);
  return {
    host: process.env.SMTP_HOST,
    porta,
    seguro: process.env.SMTP_SEGURO ? process.env.SMTP_SEGURO === "true" : porta === 465,
    usuario: process.env.SMTP_USER || undefined,
    senha: process.env.SMTP_PASS || undefined,
    remetente: process.env.EMAIL_REMETENTE,
    resposta: process.env.EMAIL_RESPOSTA || e.email || undefined,
  };
}

export async function emailConfigurado() {
  return !!(await configSmtp());
}

export async function nomeDaLoja() {
  return (await empresaAtual()).nome;
}

export type Anexo = { filename: string; content: Buffer; contentType: string; cid?: string };

export async function enviarEmail(para: string, assunto: string, html: string, texto: string, anexos: Anexo[] = []): Promise<{ erro?: string }> {
  const smtp = await configSmtp();
  if (!smtp) return { erro: "Envio de e-mail não configurado: preencha o e-mail da loja em Configurações." };
  const transporte = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.porta,
    secure: smtp.seguro,
    auth: smtp.usuario ? { user: smtp.usuario, pass: smtp.senha } : undefined,
    connectionTimeout: 15_000,
  });
  const loja = await nomeDaLoja();
  try {
    await transporte.sendMail({
      from: { name: loja, address: smtp.remetente },
      replyTo: smtp.resposta,
      to: para,
      subject: assunto,
      html,
      text: texto,
      attachments: anexos,
    });
    return {};
  } catch (e) {
    console.error("Falha ao enviar e-mail", e);
    return { erro: "O servidor de e-mail recusou o envio. Confira as configurações de SMTP." };
  }
}

/** Logo da loja como anexo embutido (cid), para aparecer no topo do e-mail. */
export async function anexoLogo(): Promise<Anexo | null> {
  const e = await prisma.empresa.findUnique({ where: { id: await empresaAtualId() }, select: { logo: true, logoTipo: true } });
  if (!e?.logo || !e.logoTipo) return null;
  const ext = e.logoTipo === "image/png" ? "png" : e.logoTipo === "image/webp" ? "webp" : "jpg";
  return { filename: `logo.${ext}`, content: Buffer.from(e.logo), contentType: e.logoTipo, cid: "logo@idesk" };
}
