// Modelos de e-mail da OS e da venda (HTML simples, que abre bem em qualquer programa de e-mail).

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

type Linha = { descricao: string; detalhe?: string | null; quantidade: number; valor: number };

function pagina(loja: string, titulo: string, saudacao: string, blocos: string, logoCid?: string | null) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:18px;padding:32px" cellpadding="0" cellspacing="0"><tr><td>
${logoCid ? `<img src="cid:${esc(logoCid)}" alt="${esc(loja)}" style="max-height:48px;max-width:160px;display:block;margin:0 0 12px">` : ""}<div style="font-size:14px;color:#6e6e73">${esc(loja)}</div>
<h1 style="font-size:26px;margin:4px 0 16px;letter-spacing:-0.02em">${esc(titulo)}</h1>
<p style="font-size:15px;line-height:1.5;margin:0 0 20px">${esc(saudacao)}</p>
${blocos}
<p style="font-size:12px;color:#6e6e73;margin:24px 0 0">Este e-mail foi enviado por ${esc(loja)}. Em caso de dúvida, responda esta mensagem ou fale com a loja.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function tabela(linhas: Linha[], rodape: [string, string, boolean?][]) {
  const itens = linhas
    .map(
      (l) => `<tr><td style="padding:8px 0;border-top:1px solid #e8e8ed;font-size:14px">${esc(l.descricao)}${
        l.detalhe ? `<div style="font-size:12px;color:#6e6e73">${esc(l.detalhe)}</div>` : ""
      }</td><td style="padding:8px 0;border-top:1px solid #e8e8ed;font-size:14px;text-align:right;white-space:nowrap">${l.quantidade} × ${reais(l.valor)}</td></tr>`,
    )
    .join("");
  const tot = rodape
    .map(
      ([r, v, forte]) =>
        `<tr><td style="padding:4px 0;font-size:${forte ? 17 : 14}px;${forte ? "font-weight:600" : "color:#424245"}">${esc(r)}</td><td style="padding:4px 0;text-align:right;font-size:${forte ? 17 : 14}px;${forte ? "font-weight:600" : ""}">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itens}<tr><td colspan="2" style="border-top:1px solid #e8e8ed;padding-top:8px"></td></tr>${tot}</table>`;
}

function campos(pares: [string, string | null | undefined][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">${pares
    .filter(([, v]) => v)
    .map(([r, v]) => `<tr><td style="padding:3px 0;font-size:13px;color:#6e6e73;width:40%">${esc(r)}</td><td style="padding:3px 0;font-size:14px">${esc(v)}</td></tr>`)
    .join("")}</table>`;
}

const texto = (linhas: string[]) => linhas.filter(Boolean).join("\n");

export type DadosEmailOS = {
  loja: string;
  logoCid?: string | null;
  cliente: string;
  numero: number;
  status: string;
  aparelho: string | null;
  imei: string | null;
  defeito: string;
  diagnostico: string | null;
  previsao: Date | null;
  garantiaDias: number;
  itens: Linha[];
  desconto: number;
  total: number;
  pago: number;
  fotos?: { cid: string; titulo: string }[]; // anexadas no e-mail e mostradas no corpo
};

export function emailOS(d: DadosEmailOS) {
  const assunto = `${d.loja}: ordem de serviço nº ${d.numero} (${d.status})`;
  const rodape: [string, string, boolean?][] = [];
  if (d.desconto > 0) rodape.push(["Desconto", `- ${reais(d.desconto)}`]);
  rodape.push(["Total", reais(d.total), true]);
  if (d.pago > 0) rodape.push(["Pago", reais(d.pago)], ["Falta pagar", reais(Math.max(d.total - d.pago, 0))]);
  const blocos =
    campos([
      ["Situação", d.status],
      ["Aparelho", d.aparelho],
      ["IMEI", d.imei],
      ["Defeito relatado", d.defeito],
      ["Diagnóstico", d.diagnostico],
      ["Previsão de entrega", d.previsao ? data(d.previsao) : null],
      ["Garantia do serviço", d.garantiaDias ? `${d.garantiaDias} dias` : null],
    ]) +
    (d.itens.length ? tabela(d.itens, rodape) : `<p style="font-size:14px;color:#6e6e73">O orçamento ainda está sendo preparado.</p>`) +
    (d.fotos?.length
      ? `<h2 style="font-size:17px;margin:24px 0 4px">Fotos do aparelho na entrada</h2><p style="font-size:13px;color:#6e6e73;margin:0 0 12px">Registro do estado em que o aparelho foi recebido na loja.</p>` +
        d.fotos
          .map(
            (f) =>
              `<div style="display:inline-block;width:48%;margin:0 1% 12px;vertical-align:top"><img src="cid:${esc(f.cid)}" alt="${esc(f.titulo)}" style="width:100%;border-radius:12px;display:block"><div style="font-size:12px;color:#424245;margin-top:4px">${esc(f.titulo)}</div></div>`,
          )
          .join("")
      : "");
  const primeiro = d.cliente.split(" ")[0];
  return {
    assunto,
    html: pagina(d.loja, `Ordem de serviço nº ${d.numero}`, `Olá, ${primeiro}. Seguem os dados da sua ordem de serviço.`, blocos, d.logoCid),
    texto: texto([
      `Olá, ${primeiro}. Seguem os dados da sua ordem de serviço nº ${d.numero} na ${d.loja}.`,
      `Situação: ${d.status}`,
      d.aparelho ? `Aparelho: ${d.aparelho}` : "",
      `Defeito relatado: ${d.defeito}`,
      d.diagnostico ? `Diagnóstico: ${d.diagnostico}` : "",
      d.previsao ? `Previsão de entrega: ${data(d.previsao)}` : "",
      ...d.itens.map((i) => `- ${i.descricao}: ${i.quantidade} x ${reais(i.valor)}`),
      d.itens.length ? `Total: ${reais(d.total)}` : "",
      d.fotos?.length ? `Fotos do aparelho na entrada: ${d.fotos.length} (em anexo)` : "",
    ]),
  };
}

export type DadosEmailVenda = {
  loja: string;
  logoCid?: string | null;
  cliente: string;
  numero: number;
  data: Date;
  itens: (Linha & { garantiaDias: number | null })[];
  subtotal: number;
  desconto: number;
  total: number;
  pagamentos: { forma: string; valor: number }[];
  notas: { modelo: string; numero: string | null; link: string | null }[];
};

export function emailVenda(d: DadosEmailVenda) {
  const rodape: [string, string, boolean?][] = [["Subtotal", reais(d.subtotal)]];
  if (d.desconto > 0) rodape.push(["Desconto", `- ${reais(d.desconto)}`]);
  rodape.push(["Total", reais(d.total), true]);
  for (const p of d.pagamentos) rodape.push([p.forma, reais(p.valor)]);
  const linhas = d.itens.map((i) => ({ ...i, detalhe: [i.detalhe, i.garantiaDias ? `Garantia de ${i.garantiaDias} dias` : null].filter(Boolean).join(" · ") }));
  const notas = d.notas
    .map((n) => `<p style="font-size:14px;margin:16px 0 0">${esc(n.modelo)}${n.numero ? ` nº ${esc(n.numero)}` : ""}${n.link ? `: <a href="${esc(n.link)}" style="color:#0066cc">abrir a nota fiscal</a>` : ""}</p>`)
    .join("");
  const primeiro = d.cliente.split(" ")[0];
  return {
    assunto: `${d.loja}: sua compra nº ${d.numero}`,
    html: pagina(d.loja, `Compra nº ${d.numero}`, `Olá, ${primeiro}. Obrigado pela compra em ${data(d.data)}. Seguem os detalhes.`, tabela(linhas, rodape) + notas, d.logoCid),
    texto: texto([
      `Olá, ${primeiro}. Obrigado pela compra nº ${d.numero} na ${d.loja} em ${data(d.data)}.`,
      ...linhas.map((i) => `- ${i.descricao}${i.detalhe ? ` (${i.detalhe})` : ""}: ${i.quantidade} x ${reais(i.valor)}`),
      `Total: ${reais(d.total)}`,
      ...d.pagamentos.map((p) => `${p.forma}: ${reais(p.valor)}`),
      ...d.notas.filter((n) => n.link).map((n) => `${n.modelo}: ${n.link}`),
    ]),
  };
}
