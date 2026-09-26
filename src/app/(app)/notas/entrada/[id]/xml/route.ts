import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/notas/entrada/[id]/xml">) {
  await exigirUsuario("notasFiscais");
  const { id } = await ctx.params;
  const nota = await prisma.notaEntrada.findUnique({ where: { id }, select: { chave: true, xml: true } });
  if (!nota) return new Response("Nota não encontrada", { status: 404 });
  return new Response(nota.xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Content-Disposition": `attachment; filename="${nota.chave}.xml"` },
  });
}
