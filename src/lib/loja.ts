import "server-only";
import { prisma } from "@/lib/db";
import { CONFIG_PADRAO } from "@/lib/agenda";

export async function configLoja() {
  const c = await prisma.lojaConfig.findFirst();
  return c ?? { id: "", empresaId: "", endereco: null, latitude: null, longitude: null, ...CONFIG_PADRAO, minutosNoLocalEntrega: 10, atualizadoEm: new Date(0) };
}
