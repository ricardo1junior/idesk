// Catálogo de modelos Apple para sugerir nos campos "Modelo" e "Capacidade".
// Vai de 2017 (iPhone 8/X) até os lançados em setembro de 2026. Qualquer modelo fora da lista
// continua podendo ser digitado à mão.

export type CategoriaApple = "iPhone" | "iPad" | "Mac" | "Apple Watch" | "AirPods" | "Outros";
export type ModeloApple = { nome: string; categoria: CategoriaApple; capacidades?: string[] };

const GB = (...n: number[]) => n.map((v) => (v >= 1024 ? `${v / 1024} TB` : `${v} GB`));

const iphones: [string, string[]][] = [
  ["iPhone 8", GB(64, 128, 256)],
  ["iPhone 8 Plus", GB(64, 128, 256)],
  ["iPhone X", GB(64, 256)],
  ["iPhone XR", GB(64, 128, 256)],
  ["iPhone XS", GB(64, 256, 512)],
  ["iPhone XS Max", GB(64, 256, 512)],
  ["iPhone 11", GB(64, 128, 256)],
  ["iPhone 11 Pro", GB(64, 256, 512)],
  ["iPhone 11 Pro Max", GB(64, 256, 512)],
  ["iPhone SE (2ª geração)", GB(64, 128, 256)],
  ["iPhone 12 mini", GB(64, 128, 256)],
  ["iPhone 12", GB(64, 128, 256)],
  ["iPhone 12 Pro", GB(128, 256, 512)],
  ["iPhone 12 Pro Max", GB(128, 256, 512)],
  ["iPhone 13 mini", GB(128, 256, 512)],
  ["iPhone 13", GB(128, 256, 512)],
  ["iPhone 13 Pro", GB(128, 256, 512, 1024)],
  ["iPhone 13 Pro Max", GB(128, 256, 512, 1024)],
  ["iPhone SE (3ª geração)", GB(64, 128, 256)],
  ["iPhone 14", GB(128, 256, 512)],
  ["iPhone 14 Plus", GB(128, 256, 512)],
  ["iPhone 14 Pro", GB(128, 256, 512, 1024)],
  ["iPhone 14 Pro Max", GB(128, 256, 512, 1024)],
  ["iPhone 15", GB(128, 256, 512)],
  ["iPhone 15 Plus", GB(128, 256, 512)],
  ["iPhone 15 Pro", GB(128, 256, 512, 1024)],
  ["iPhone 15 Pro Max", GB(256, 512, 1024)],
  ["iPhone 16", GB(128, 256, 512)],
  ["iPhone 16 Plus", GB(128, 256, 512)],
  ["iPhone 16 Pro", GB(128, 256, 512, 1024)],
  ["iPhone 16 Pro Max", GB(256, 512, 1024)],
  ["iPhone 16e", GB(128, 256, 512)],
  ["iPhone 17", GB(256, 512)],
  ["iPhone Air", GB(256, 512, 1024)],
  ["iPhone 17 Pro", GB(256, 512, 1024)],
  ["iPhone 17 Pro Max", GB(256, 512, 1024, 2048)],
  ["iPhone 17e", GB(256, 512)],
  ["iPhone 18 Pro", GB(256, 512, 1024)],
  ["iPhone 18 Pro Max", GB(256, 512, 1024, 2048)],
  ["iPhone Duo (dobrável)", GB(256, 512, 1024)],
];

const CAP_IPAD = GB(64, 128, 256, 512, 1024, 2048);
const ipads = [
  "iPad (7ª geração)", "iPad (8ª geração)", "iPad (9ª geração)", "iPad (10ª geração)", "iPad (A16)",
  "iPad mini (5ª geração)", "iPad mini (6ª geração)", "iPad mini (A17 Pro)",
  "iPad Air (3ª geração)", "iPad Air (4ª geração)", "iPad Air (5ª geração, M1)",
  "iPad Air 11\" (M2)", "iPad Air 13\" (M2)", "iPad Air 11\" (M3)", "iPad Air 13\" (M3)", "iPad Air 11\" (M4)", "iPad Air 13\" (M4)",
  "iPad Pro 11\" (1ª geração)", "iPad Pro 11\" (2ª geração)", "iPad Pro 11\" (3ª geração, M1)", "iPad Pro 11\" (4ª geração, M2)",
  "iPad Pro 12,9\" (3ª geração)", "iPad Pro 12,9\" (4ª geração)", "iPad Pro 12,9\" (5ª geração, M1)", "iPad Pro 12,9\" (6ª geração, M2)",
  "iPad Pro 11\" (M4)", "iPad Pro 13\" (M4)", "iPad Pro 11\" (M5)", "iPad Pro 13\" (M5)",
];

const CAP_MAC = GB(256, 512, 1024, 2048, 4096, 8192);
const macs = [
  "MacBook Air 13\" (Intel, 2018–2020)", "MacBook Air 13\" (M1, 2020)",
  "MacBook Air 13\" (M2, 2022)", "MacBook Air 15\" (M2, 2023)",
  "MacBook Air 13\" (M3, 2024)", "MacBook Air 15\" (M3, 2024)",
  "MacBook Air 13\" (M4, 2025)", "MacBook Air 15\" (M4, 2025)",
  "MacBook Air 13\" (M5, 2026)", "MacBook Air 15\" (M5, 2026)",
  "MacBook Neo (2026)",
  "MacBook Pro 13\" (Intel, 2017–2020)", "MacBook Pro 15\" (Intel, 2017–2019)", "MacBook Pro 16\" (Intel, 2019)",
  "MacBook Pro 13\" (M1, 2020)", "MacBook Pro 13\" (M2, 2022)",
  "MacBook Pro 14\" (M1 Pro/Max, 2021)", "MacBook Pro 16\" (M1 Pro/Max, 2021)",
  "MacBook Pro 14\" (M2 Pro/Max, 2023)", "MacBook Pro 16\" (M2 Pro/Max, 2023)",
  "MacBook Pro 14\" (M3, 2023)", "MacBook Pro 14\" (M3 Pro/Max, 2023)", "MacBook Pro 16\" (M3 Pro/Max, 2023)",
  "MacBook Pro 14\" (M4, 2024)", "MacBook Pro 14\" (M4 Pro/Max, 2024)", "MacBook Pro 16\" (M4 Pro/Max, 2024)",
  "MacBook Pro 14\" (M5, 2025)", "MacBook Pro 14\" (M5 Pro/Max, 2026)", "MacBook Pro 16\" (M5 Pro/Max, 2026)",
  "iMac 21,5\" (Intel)", "iMac 27\" (Intel)", "iMac 24\" (M1)", "iMac 24\" (M3)", "iMac 24\" (M4)",
  "Mac mini (Intel)", "Mac mini (M1)", "Mac mini (M2)", "Mac mini (M4)", "Mac mini (2026)",
  "Mac Studio (M1 Max/Ultra)", "Mac Studio (M2 Max/Ultra)", "Mac Studio (M4 Max/M3 Ultra)", "Mac Studio (2026)",
  "Mac Pro (Intel)", "Mac Pro (M2 Ultra)",
];

const watches = [
  "Apple Watch Series 3", "Apple Watch Series 4", "Apple Watch Series 5", "Apple Watch SE (1ª geração)",
  "Apple Watch Series 6", "Apple Watch Series 7", "Apple Watch Series 8", "Apple Watch SE (2ª geração)",
  "Apple Watch Series 9", "Apple Watch Series 10", "Apple Watch Series 11", "Apple Watch SE 3", "Apple Watch Series 12",
  "Apple Watch Ultra", "Apple Watch Ultra 2", "Apple Watch Ultra 3", "Apple Watch Ultra 4",
];

const airpods = [
  "AirPods (1ª geração)", "AirPods (2ª geração)", "AirPods (3ª geração)", "AirPods 4", "AirPods 4 com cancelamento de ruído", "AirPods 5",
  "AirPods Pro (1ª geração)", "AirPods Pro (2ª geração)", "AirPods Pro 3", "AirPods Max", "AirPods Max 2",
];

const outros = [
  "Apple TV 4K", "Apple TV HD", "HomePod", "HomePod mini", "Apple Vision Pro",
  "AirTag", "AirTag (2ª geração)", "Apple Pencil (1ª geração)", "Apple Pencil (2ª geração)", "Apple Pencil (USB-C)", "Apple Pencil Pro",
  "Magic Keyboard", "Magic Mouse", "Magic Trackpad", "Studio Display", "Studio Display XDR", "Pro Display XDR",
];

export const MODELOS_APPLE: ModeloApple[] = [
  ...iphones.map(([nome, capacidades]) => ({ nome, categoria: "iPhone" as const, capacidades })),
  ...ipads.map((nome) => ({ nome, categoria: "iPad" as const, capacidades: CAP_IPAD })),
  ...macs.map((nome) => ({ nome, categoria: "Mac" as const, capacidades: CAP_MAC })),
  ...watches.map((nome) => ({ nome, categoria: "Apple Watch" as const })),
  ...airpods.map((nome) => ({ nome, categoria: "AirPods" as const })),
  ...outros.map((nome) => ({ nome, categoria: "Outros" as const })),
];

/** Capacidades conhecidas do modelo digitado; sem modelo reconhecido, as mais comuns. */
export function capacidadesDoModelo(modelo: string | undefined): string[] {
  const achado = modelo && MODELOS_APPLE.find((m) => m.nome.toLowerCase() === modelo.trim().toLowerCase());
  return (achado && achado.capacidades) || GB(64, 128, 256, 512, 1024);
}

const ACESSORIOS_OUTROS = /^(AirTag|Apple Pencil|Magic )/;

/** Produtos a criar a partir do catálogo: um por modelo (a capacidade fica em cada aparelho). */
export function produtosDoCatalogo(): { descricao: string; modelo: string; tipo: "APARELHO" | "ACESSORIO" }[] {
  return MODELOS_APPLE.map((m) => ({
    descricao: m.nome,
    modelo: m.nome,
    tipo: m.categoria === "Outros" && ACESSORIOS_OUTROS.test(m.nome) ? "ACESSORIO" : "APARELHO",
  }));
}

/** Tira do catálogo o que já existe no estoque (compara modelo ou descrição, sem maiúsculas). */
export function faltandoNoEstoque<T extends { modelo: string }>(catalogo: T[], existentes: { modelo: string | null; descricao: string }[]): T[] {
  const ja = new Set(existentes.flatMap((p) => [p.modelo, p.descricao]).filter(Boolean).map((s) => s!.trim().toLowerCase()));
  return catalogo.filter((c) => !ja.has(c.modelo.toLowerCase()));
}
