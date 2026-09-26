"use server";

import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enviarEmail, nomeDaLoja } from "@/lib/email";
import { emailOS, emailVenda } from "@/lib/email-modelos";
import { CONDICOES } from "@/lib/estoque";
import { linkFocus } from "@/lib/nfe/focus";
import { STATUS_OS } from "@/lib/os";
import { FORMAS_PAGAMENTO, totalItem } from "@/lib/vendas";

// Só envia para um e-mail que esteja no cadastro do cliente.
async function emailDoCliente(clienteId: string, para: string) {
  const alvo = para.trim().toLowerCase();
  const c = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { email: true, contatos: { where: { tipo: "EMAIL" }, select: { valor: true } } },
  });
  const lista = [c?.email, ...(c?.contatos.map((x) => x.valor) ?? [])].filter(Boolean).map((e) => e!.toLowerCase());
  return lista.includes(alvo) ? alvo : null;
}

export async function enviarEmailOS(osId: string, para: string): Promise<{ erro?: string; ok?: string }> {
  await exigirUsuario("os");
  const os = await prisma.ordemServico.findUnique({
    where: { id: osId },
    include: { cliente: true, aparelho: true, itens: { orderBy: { id: "asc" } }, lancamentos: { where: { status: "PAGO" } } },
  });
  if (!os) return { erro: "OS não encontrada." };
  const destino = await emailDoCliente(os.clienteId, para);
  if (!destino) return { erro: "Escolha um e-mail cadastrado no cliente." };

  const e = emailOS({
    loja: await nomeDaLoja(),
    cliente: os.cliente.nome,
    numero: os.numero,
    status: STATUS_OS[os.status].label,
    aparelho: os.aparelho ? [os.aparelho.modelo, os.aparelho.capacidade, os.aparelho.cor].filter(Boolean).join(" ") : null,
    imei: os.aparelho?.imei ?? null,
    defeito: os.defeitoRelatado,
    diagnostico: os.diagnostico,
    previsao: os.previsaoEntrega,
    garantiaDias: os.garantiaDias,
    itens: os.itens.map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, valor: Number(i.valorUnit) })),
    desconto: Number(os.desconto),
    total: Number(os.total),
    pago: os.lancamentos.reduce((s, l) => s + Number(l.valor), 0),
  });
  const r = await enviarEmail(destino, e.assunto, e.html, e.texto);
  if (r.erro) return r;
  await prisma.historicoOS.create({ data: { osId, status: os.status, nota: `E-mail da OS enviado para ${destino}` } });
  revalidatePath(`/os/${osId}`);
  return { ok: `Enviado para ${destino}.` };
}

export async function enviarEmailVenda(vendaId: string, para: string): Promise<{ erro?: string; ok?: string }> {
  await exigirUsuario("vendas");
  const v = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { cliente: true, itens: { include: { aparelho: true }, orderBy: { id: "asc" } }, pagamentos: true, notas: { where: { status: "AUTORIZADA" } } },
  });
  if (!v || !v.cliente) return { erro: "Esta venda não tem cliente identificado." };
  const destino = await emailDoCliente(v.cliente.id, para);
  if (!destino) return { erro: "Escolha um e-mail cadastrado no cliente." };

  const e = emailVenda({
    loja: await nomeDaLoja(),
    cliente: v.cliente.nome,
    numero: v.numero,
    data: v.criadoEm,
    itens: v.itens.map((i) => ({
      descricao: i.descricao,
      detalhe: i.aparelho ? [i.aparelho.imei && `IMEI ${i.aparelho.imei}`, i.aparelho.serial && `Série ${i.aparelho.serial}`, CONDICOES[i.aparelho.condicao]].filter(Boolean).join(" · ") : null,
      quantidade: i.quantidade,
      valor: totalItem({ quantidade: 1, valorUnit: Number(i.valorUnit), desconto: Number(i.desconto) / i.quantidade }),
      garantiaDias: i.garantiaDias,
    })),
    subtotal: Number(v.subtotal),
    desconto: Number(v.desconto),
    total: Number(v.total),
    pagamentos: v.pagamentos.map((p) => ({ forma: FORMAS_PAGAMENTO[p.forma], valor: Number(p.valor) })),
    notas: v.notas.map((n) => ({ modelo: n.modelo === "NFCE" ? "NFC-e" : "NF-e", numero: n.numero, link: linkFocus(n.ambiente, n.caminhoDanfe) })),
  });
  const r = await enviarEmail(destino, e.assunto, e.html, e.texto);
  return r.erro ? r : { ok: `Enviado para ${destino}.` };
}
