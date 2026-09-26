import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/fotos-os/[id]">) {
  await exigirUsuario("os");
  const { id } = await ctx.params;
  const foto = await prisma.fotoOS.findUnique({ where: { id }, select: { mime: true, dados: true } });
  if (!foto) return new Response("Foto não encontrada", { status: 404 });
  return new Response(new Uint8Array(foto.dados), {
    headers: { "Content-Type": foto.mime, "Cache-Control": "private, max-age=86400, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
