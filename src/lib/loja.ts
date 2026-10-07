import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CONFIG_PADRAO } from "@/lib/agenda";

export async function configLoja() {
  const c = await prisma.lojaConfig.findFirst();
  return c ?? { id: "", empresaId: "", endereco: null, latitude: null, longitude: null, ...CONFIG_PADRAO, minutosNoLocalEntrega: 10, motoboyTaxaFixa: new Prisma.Decimal(8), motoboyValorKm: new Prisma.Decimal(2), motoboyMinutosRetirada: 15, atualizadoEm: new Date(0) };
}
