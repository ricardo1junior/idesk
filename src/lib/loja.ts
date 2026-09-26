import "server-only";
import { prisma } from "@/lib/db";
import { CONFIG_PADRAO } from "@/lib/agenda";

export async function configLoja() {
  const c = await prisma.lojaConfig.findUnique({ where: { id: "loja" } });
  return c ?? { id: "loja", endereco: null, latitude: null, longitude: null, ...CONFIG_PADRAO, minutosNoLocalEntrega: 10, atualizadoEm: new Date(0) };
}
