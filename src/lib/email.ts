import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

// Envio de e-mails pelo SMTP configurado no servidor (Gmail, Outlook, Zoho, provedor do domínio etc.).

export function emailConfigurado() {
  return !!process.env.SMTP_HOST && !!process.env.EMAIL_REMETENTE;
}

export async function nomeDaLoja() {
  const empresa = await prisma.empresaFiscal.findUnique({ where: { id: "empresa" }, select: { nomeFantasia: true, razaoSocial: true } });
  return process.env.LOJA_NOME || empresa?.nomeFantasia || empresa?.razaoSocial || "iDesk";
}

export type Anexo = { filename: string; content: Buffer; contentType: string; cid?: string };

export async function enviarEmail(para: string, assunto: string, html: string, texto: string, anexos: Anexo[] = []): Promise<{ erro?: string }> {
  if (!emailConfigurado()) return { erro: "Envio de e-mail não configurado: defina SMTP_HOST e EMAIL_REMETENTE no servidor." };
  const porta = Number(process.env.SMTP_PORT || 587);
  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: porta,
    secure: process.env.SMTP_SEGURO ? process.env.SMTP_SEGURO === "true" : porta === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 15_000,
  });
  const loja = await nomeDaLoja();
  try {
    await transporte.sendMail({
      from: { name: loja, address: process.env.EMAIL_REMETENTE! },
      replyTo: process.env.EMAIL_RESPOSTA || undefined,
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
