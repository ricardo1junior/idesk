import { atualizarCarteira } from "@/lib/carteira";
import { prismaBase } from "@/lib/db";
import { segredoConfere } from "@/lib/segredo";

// Rotina diária (chamada uma vez por dia com a CRON_SECRET): desconta as diárias de todas as lojas, mesmo das que não abriram o sistema.
export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
  if (!segredoConfere(token, process.env.CRON_SECRET)) return Response.json({ erro: "Não autorizado" }, { status: 401 });
  const lojas = await prismaBase.empresa.findMany({ where: { ativa: true, isenta: false }, select: { id: true } });
  let falhas = 0;
  for (const l of lojas) {
    await atualizarCarteira(l.id).catch((e) => {
      falhas++;
      console.error("Falha na diária da loja", l.id, e);
    });
  }
  // Aproveita para apagar sessões vencidas.
  const sessoes = await prismaBase.sessao.deleteMany({ where: { expiraEm: { lt: new Date() } } });
  return Response.json({ lojas: lojas.length, falhas, sessoesApagadas: sessoes.count });
}
