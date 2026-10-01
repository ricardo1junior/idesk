import { confirmarRecarga, estornarRecarga } from "@/lib/carteira";
import { segredoConfere } from "@/lib/segredo";

// Aviso automático do Asaas quando uma cobrança é paga.
// Configure no Asaas: URL https://<seu-site>/api/asaas/webhook e o token igual a ASAAS_WEBHOOK_TOKEN.
const EVENTOS_PAGOS = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"];
const EVENTOS_ESTORNO = ["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE"];

export async function POST(req: Request) {
  if (!segredoConfere(req.headers.get("asaas-access-token"), process.env.ASAAS_WEBHOOK_TOKEN)) {
    return Response.json({ erro: "Token inválido" }, { status: 401 });
  }
  const corpo = (await req.json().catch(() => null)) as { event?: string; payment?: { id?: string } } | null;
  const id = corpo?.payment?.id;
  const evento = corpo?.event ?? "";
  if (id && (EVENTOS_PAGOS.includes(evento) || EVENTOS_ESTORNO.includes(evento) || evento === "PAYMENT_DELETED")) {
    try {
      if (EVENTOS_PAGOS.includes(evento)) await confirmarRecarga(id);
      else await estornarRecarga(id, evento === "PAYMENT_DELETED" ? "APAGADA" : "ESTORNO");
    } catch (e) {
      // Devolve erro para o Asaas tentar de novo mais tarde.
      console.error("Falha ao processar aviso do Asaas", id, e);
      return Response.json({ erro: "Falha ao confirmar" }, { status: 500 });
    }
  }
  return Response.json({ recebido: true });
}
