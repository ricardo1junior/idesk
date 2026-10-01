import "server-only";

// Cliente da API do Asaas (https://docs.asaas.com), usado para a loja comprar créditos.
// Autenticação: header "access_token". Sandbox para testes, produção para cobrar de verdade.

export type FormaAsaas = "PIX" | "BOLETO" | "CREDIT_CARD";
export type CobrancaAsaas = { id: string; status: string; value: number; invoiceUrl?: string; bankSlipUrl?: string; externalReference?: string };

export function asaasConfigurado() {
  return !!process.env.ASAAS_API_KEY;
}

function urlBase() {
  if (process.env.ASAAS_API_URL) return process.env.ASAAS_API_URL.replace(/\/$/, "");
  return process.env.ASAAS_AMBIENTE === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

export class ErroAsaas extends Error {}

async function chamar<T>(metodo: string, rota: string, corpo?: unknown): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(`${urlBase()}${rota}`, {
      method: metodo,
      headers: { access_token: process.env.ASAAS_API_KEY ?? "", "Content-Type": "application/json", "User-Agent": "iDesk" },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ErroAsaas("Não foi possível falar com o Asaas. Tente de novo em instantes.");
  }
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = (dados as { errors?: { description?: string }[] }).errors?.[0]?.description;
    throw new ErroAsaas(msg ? `Asaas: ${msg}` : `O Asaas recusou o pedido (HTTP ${resp.status}).`);
  }
  return dados as T;
}

export async function criarClienteAsaas(c: { nome: string; documento: string; email?: string | null; referencia: string }) {
  const r = await chamar<{ id: string }>("POST", "/customers", {
    name: c.nome,
    cpfCnpj: c.documento,
    email: c.email ?? undefined,
    externalReference: c.referencia,
    notificationDisabled: true,
  });
  return r.id;
}

export function criarCobrancaAsaas(c: { cliente: string; forma: FormaAsaas; valor: number; vencimento: string; descricao: string; referencia: string }) {
  return chamar<CobrancaAsaas>("POST", "/payments", {
    customer: c.cliente,
    billingType: c.forma,
    value: c.valor,
    dueDate: c.vencimento,
    description: c.descricao,
    externalReference: c.referencia,
  });
}

export function pixDaCobranca(id: string) {
  return chamar<{ encodedImage: string; payload: string }>("GET", `/payments/${encodeURIComponent(id)}/pixQrCode`);
}

export function consultarCobranca(id: string) {
  return chamar<CobrancaAsaas>("GET", `/payments/${encodeURIComponent(id)}`);
}

/** Status do Asaas que significam dinheiro recebido (cartão aprovado conta como confirmado). */
export const STATUS_PAGO = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
