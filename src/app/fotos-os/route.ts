import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_BYTES_FOTO, tipoImagem } from "@/lib/fotos";

// Recebe uma foto (já reduzida no navegador) e devolve o id. Ela fica solta até ser ligada a uma OS.
export async function POST(req: Request) {
  const usuario = await exigirUsuario("os");
  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("foto");
  if (!(arquivo instanceof File)) return Response.json({ erro: "Envie uma imagem." }, { status: 400 });
  if (arquivo.size > MAX_BYTES_FOTO) return Response.json({ erro: "Imagem muito grande (máximo 3 MB)." }, { status: 413 });
  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const mime = tipoImagem(dados);
  if (!mime) return Response.json({ erro: "Formato não suportado. Use JPG, PNG ou WEBP." }, { status: 415 });

  // Limpa fotos de aberturas de OS que não foram concluídas.
  await prisma.fotoOS.deleteMany({ where: { osId: null, criadoEm: { lt: new Date(Date.now() - 24 * 3600_000) } } });
  const foto = await prisma.fotoOS.create({ data: { mime, dados, tamanho: dados.length, usuarioId: usuario.id }, select: { id: true } });
  return Response.json({ id: foto.id });
}
