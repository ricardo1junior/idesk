import { z } from "zod";

export const TIPOS_FOTO = {
  GERAL: "Geral",
  RISCO: "Riscado",
  AMASSADO: "Amassado",
  QUEBRADO: "Quebrado / trincado",
  OUTRO: "Outro dano",
} as const;

export type TipoFotoChave = keyof typeof TIPOS_FOTO;

export const MAX_FOTOS_OS = 20;
export const MAX_BYTES_FOTO = 3 * 1024 * 1024;

// Fotos enviadas pelo formulário: id do upload + tipo do dano + legenda.
export const fotosSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(40),
      tipo: z.enum(Object.keys(TIPOS_FOTO) as [TipoFotoChave, ...TipoFotoChave[]]),
      legenda: z.string().trim().max(120).optional().default(""),
    }),
  )
  .max(MAX_FOTOS_OS);

export function lerFotosJson(valor: unknown) {
  if (typeof valor !== "string" || !valor) return [];
  try {
    const r = fotosSchema.safeParse(JSON.parse(valor));
    return r.success ? r.data : [];
  } catch {
    return [];
  }
}

// Confere o tipo real do arquivo pelos primeiros bytes (não confia na extensão).
export function tipoImagem(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}
