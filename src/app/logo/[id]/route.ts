import { prismaBase } from "@/lib/db";

// Logo da loja. Público de propósito: aparece na tela, na impressão e pode ir em e-mails.
export async function GET(_req: Request, { params }: RouteContext<"/logo/[id]">) {
  const { id } = await params;
  const e = await prismaBase.empresa.findUnique({ where: { id }, select: { logo: true, logoTipo: true } });
  if (!e?.logo || !e.logoTipo) return new Response(null, { status: 404 });
  return new Response(Buffer.from(e.logo), {
    headers: { "Content-Type": e.logoTipo, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
