import { confirmarRecarga } from "@/lib/carteira";
import { segredoConfere } from "@/lib/segredo";

// Aviso automático do Asaas quando uma cobrança é paga.
// Configure no Asaas: URL https://<seu-site>/api/asaas/webhook e o token igual a ASAAS_WEBHOOK_TOKEN.
const EVENTOS_PAGOS = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"];

export async function POST(req: Request) {
  if (!segredoConfere(req.headers.get("asaas-access-token"), process.env.ASAAS_WEBHOOK_TOKEN)) {
    return Response.json({ erro: "Token inválido" }, { status: 401 });
  }
  const corpo = (await req.json().catch(() => null)) as { event?: string; payment?: { id?: string } } | null;
  const id = corpo?.payment?.id;
  if (corpo?.event && EVENTOS_PAGOS.includes(corpo.event) && id) {
    try {
      await confirmarRecarga(id);
    } catch (e) {
      // Devolve erro para o Asaas tentar de novo mais tarde.
      console.error("Falha ao confirmar recarga do Asaas", id, e);
      return Response.json({ erro: "Falha ao confirmar" }, { status: 500 });
    }
  }
  return Response.json({ recebido: true });
}
