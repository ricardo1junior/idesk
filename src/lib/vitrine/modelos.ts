// Ficha técnica dos iPhones da Vitrine 3D, do XR (2018) ao mais recente.
// Sem dependência do three.js para poder ser usado no servidor e nas tabelas de comparação.
// Medidas em milímetros e gramas, conforme as especificações publicadas pela Apple.

export type CorIphone = { nome: string; traseira: string; aro: string };

export type Frente = "entalhe" | "entalhe-menor" | "ilha" | "ilha-menor" | "botao-inicio" | "dobravel";
export type Cameras =
  | "lente-unica" // XR, 16e: uma lente com anel, sem platô
  | "se" // SE: lente e flash em linha
  | "pilula-dupla" // XS: duas lentes em pílula vertical
  | "quadrado-vertical" // 11, 12: platô quadrado, lentes uma sobre a outra
  | "quadrado-diagonal" // 13, 14, 15
  | "quadrado-triplo" // 11 Pro a 16 Pro
  | "pilula-vertical" // 16, 17: platô com pílula vertical
  | "barra-pro" // 17 Pro e 18 Pro: platô na largura toda
  | "barra-air" // iPhone Air
  | "barra-duo"; // iPhone Duo (dobrável)
export type Material = "aluminio" | "aco" | "titanio";

export type ModeloIphone = {
  id: string;
  nome: string;
  ano: number;
  lancamento: string;
  altura: number;
  largura: number;
  espessura: number;
  peso: number;
  raio: number; // raio dos cantos
  bordasRetas: boolean; // laterais retas (12 em diante) ou arredondadas
  tela: { polegadas: number; tipo: "LCD" | "OLED"; resolucao: string; ppi: number; hz: number; brilhoPico: number };
  telaExterna?: { polegadas: number; resolucao: string };
  frente: Frente;
  chip: string;
  bateriaMah: number;
  videoHoras: number;
  cameras: Cameras;
  camerasTexto: string[];
  zoomOptico: string;
  frontal: string;
  lidar: boolean;
  biometria: "Face ID" | "Touch ID";
  porta: "Lightning" | "USB-C";
  botaoAcao: boolean;
  controleCamera: boolean;
  magsafe: boolean;
  camaraVapor: boolean;
  gavetaChip: boolean;
  material: Material;
  traseira: "vidro" | "vidro-fosco" | "aluminio";
  agua: string;
  armazenamento: string;
  conectividade: string;
  cores: CorIphone[];
};

const c = (nome: string, traseira: string, aro = traseira): CorIphone => ({ nome, traseira, aro });

export const MODELOS: ModeloIphone[] = [
  {
    id: "iphone-xr", nome: "iPhone XR", ano: 2018, lancamento: "Outubro de 2018",
    altura: 150.9, largura: 75.7, espessura: 8.3, peso: 194, raio: 11.6, bordasRetas: false,
    tela: { polegadas: 6.1, tipo: "LCD", resolucao: "1792 × 828", ppi: 326, hz: 60, brilhoPico: 625 },
    frente: "entalhe", chip: "A12 Bionic", bateriaMah: 2942, videoHoras: 16,
    cameras: "lente-unica", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.8"], zoomOptico: "—", frontal: "7 MP, ƒ/2.2", lidar: false,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: false, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro", agua: "IP67 (1 m por 30 min)", armazenamento: "64, 128 e 256 GB", conectividade: "4G LTE, Wi-Fi 5",
    cores: [c("Preto", "#1c1d20", "#2a2b2e"), c("Branco", "#f4f4f2", "#e6e6e3"), c("Azul", "#3e9fd4", "#4aa7da"), c("Amarelo", "#f6d046", "#f2c93b"), c("Coral", "#f26b55", "#ef6450"), c("(PRODUCT)RED", "#b5121b", "#a50f17")],
  },
  {
    id: "iphone-xs", nome: "iPhone XS", ano: 2018, lancamento: "Setembro de 2018",
    altura: 143.6, largura: 70.9, espessura: 7.7, peso: 177, raio: 10.8, bordasRetas: false,
    tela: { polegadas: 5.8, tipo: "OLED", resolucao: "2436 × 1125", ppi: 458, hz: 60, brilhoPico: 625 },
    frente: "entalhe", chip: "A12 Bionic", bateriaMah: 2658, videoHoras: 14,
    cameras: "pilula-dupla", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.8", "Teleobjetiva de 12 MP, ƒ/2.4"], zoomOptico: "2x", frontal: "7 MP, ƒ/2.2", lidar: false,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: false, camaraVapor: false, gavetaChip: true,
    material: "aco", traseira: "vidro", agua: "IP68 (2 m por 30 min)", armazenamento: "64, 256 e 512 GB", conectividade: "4G LTE, Wi-Fi 5",
    cores: [c("Cinza-espacial", "#2b2c30", "#5b5c60"), c("Prateado", "#eceef0", "#d6d8db"), c("Dourado", "#f5e3cf", "#e3c49b")],
  },
  {
    id: "iphone-xs-max", nome: "iPhone XS Max", ano: 2018, lancamento: "Setembro de 2018",
    altura: 157.5, largura: 77.4, espessura: 7.7, peso: 208, raio: 11.8, bordasRetas: false,
    tela: { polegadas: 6.5, tipo: "OLED", resolucao: "2688 × 1242", ppi: 458, hz: 60, brilhoPico: 625 },
    frente: "entalhe", chip: "A12 Bionic", bateriaMah: 3174, videoHoras: 15,
    cameras: "pilula-dupla", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.8", "Teleobjetiva de 12 MP, ƒ/2.4"], zoomOptico: "2x", frontal: "7 MP, ƒ/2.2", lidar: false,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: false, camaraVapor: false, gavetaChip: true,
    material: "aco", traseira: "vidro", agua: "IP68 (2 m por 30 min)", armazenamento: "64, 256 e 512 GB", conectividade: "4G LTE, Wi-Fi 5",
    cores: [c("Cinza-espacial", "#2b2c30", "#5b5c60"), c("Prateado", "#eceef0", "#d6d8db"), c("Dourado", "#f5e3cf", "#e3c49b")],
  },
  {
    id: "iphone-11", nome: "iPhone 11", ano: 2019, lancamento: "Setembro de 2019",
    altura: 150.9, largura: 75.7, espessura: 8.3, peso: 194, raio: 11.6, bordasRetas: false,
    tela: { polegadas: 6.1, tipo: "LCD", resolucao: "1792 × 828", ppi: 326, hz: 60, brilhoPico: 625 },
    frente: "entalhe", chip: "A13 Bionic", bateriaMah: 3110, videoHoras: 17,
    cameras: "quadrado-vertical", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.8", "Ultra-angular de 12 MP, ƒ/2.4, 120°"], zoomOptico: "2x para trás", frontal: "12 MP, ƒ/2.2", lidar: false,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: false, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro", agua: "IP68 (2 m por 30 min)", armazenamento: "64, 128 e 256 GB", conectividade: "4G LTE, Wi-Fi 6",
    cores: [c("Roxo", "#d1c6e6", "#c9bde0"), c("Verde", "#b9e3c9", "#aedabe"), c("Amarelo", "#fbe68a", "#f5dc77"), c("Preto", "#1f2023", "#2b2c2f"), c("Branco", "#f6f6f4", "#e7e7e4"), c("(PRODUCT)RED", "#b5121b", "#a50f17")],
  },
  {
    id: "iphone-11-pro", nome: "iPhone 11 Pro", ano: 2019, lancamento: "Setembro de 2019",
    altura: 144, largura: 71.4, espessura: 8.1, peso: 188, raio: 10.8, bordasRetas: false,
    tela: { polegadas: 5.8, tipo: "OLED", resolucao: "2436 × 1125", ppi: 458, hz: 60, brilhoPico: 1200 },
    frente: "entalhe", chip: "A13 Bionic", bateriaMah: 3046, videoHoras: 18,
    cameras: "quadrado-triplo", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.8", "Ultra-angular de 12 MP, ƒ/2.4", "Teleobjetiva de 12 MP, ƒ/2.0"], zoomOptico: "2x", frontal: "12 MP, ƒ/2.2", lidar: false,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: false, camaraVapor: false, gavetaChip: true,
    material: "aco", traseira: "vidro-fosco", agua: "IP68 (4 m por 30 min)", armazenamento: "64, 256 e 512 GB", conectividade: "4G LTE, Wi-Fi 6",
    cores: [c("Verde-meia-noite", "#4e5851", "#5a645c"), c("Cinza-espacial", "#3b3c3f", "#5b5c60"), c("Prateado", "#ebebe6", "#d6d8db"), c("Dourado", "#f3dcc4", "#e0c39d")],
  },
  {
    id: "iphone-11-pro-max", nome: "iPhone 11 Pro Max", ano: 2019, lancamento: "Setembro de 2019",
    altura: 158, largura: 77.8, espessura: 8.1, peso: 226, raio: 11.8, bordasRetas: false,
    tela: { polegadas: 6.5, tipo: "OLED", resolucao: "2688 × 1242", ppi: 458, hz: 60, brilhoPico: 1200 },
    frente: "entalhe", chip: "A13 Bionic", bateriaMah: 3969, videoHoras: 20,
    cameras: "quadrado-triplo", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.8", "Ultra-angular de 12 MP, ƒ/2.4", "Teleobjetiva de 12 MP, ƒ/2.0"], zoomOptico: "2x", frontal: "12 MP, ƒ/2.2", lidar: false,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: false, camaraVapor: false, gavetaChip: true,
    material: "aco", traseira: "vidro-fosco", agua: "IP68 (4 m por 30 min)", armazenamento: "64, 256 e 512 GB", conectividade: "4G LTE, Wi-Fi 6",
    cores: [c("Verde-meia-noite", "#4e5851", "#5a645c"), c("Cinza-espacial", "#3b3c3f", "#5b5c60"), c("Prateado", "#ebebe6", "#d6d8db"), c("Dourado", "#f3dcc4", "#e0c39d")],
  },
  {
    id: "iphone-se-2", nome: "iPhone SE (2ª geração)", ano: 2020, lancamento: "Abril de 2020",
    altura: 138.4, largura: 67.3, espessura: 7.3, peso: 148, raio: 9, bordasRetas: false,
    tela: { polegadas: 4.7, tipo: "LCD", resolucao: "1334 × 750", ppi: 326, hz: 60, brilhoPico: 625 },
    frente: "botao-inicio", chip: "A13 Bionic", bateriaMah: 1821, videoHoras: 13,
    cameras: "se", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.8"], zoomOptico: "—", frontal: "7 MP, ƒ/2.2", lidar: false,
    biometria: "Touch ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: false, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro", agua: "IP67 (1 m por 30 min)", armazenamento: "64, 128 e 256 GB", conectividade: "4G LTE, Wi-Fi 6",
    cores: [c("Preto", "#1c1d20", "#2a2b2e"), c("Branco", "#f4f4f2", "#e6e6e3"), c("(PRODUCT)RED", "#b5121b", "#a50f17")],
  },
  {
    id: "iphone-12-mini", nome: "iPhone 12 mini", ano: 2020, lancamento: "Novembro de 2020",
    altura: 131.5, largura: 64.2, espessura: 7.4, peso: 133, raio: 9.6, bordasRetas: true,
    tela: { polegadas: 5.4, tipo: "OLED", resolucao: "2340 × 1080", ppi: 476, hz: 60, brilhoPico: 1200 },
    frente: "entalhe", chip: "A14 Bionic", bateriaMah: 2227, videoHoras: 15,
    cameras: "quadrado-vertical", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.6", "Ultra-angular de 12 MP, ƒ/2.4"], zoomOptico: "2x para trás", frontal: "12 MP, ƒ/2.2", lidar: false,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro", agua: "IP68 (6 m por 30 min)", armazenamento: "64, 128 e 256 GB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Preto", "#25262a", "#2f3034"), c("Branco", "#f4f4f2", "#e4e4e1"), c("Azul", "#1f4a73", "#284f78"), c("Verde", "#d4e8d1", "#c5dcc2"), c("Roxo", "#c9bfdc", "#bfb4d4"), c("(PRODUCT)RED", "#b5121b", "#a50f17")],
  },
  {
    id: "iphone-12", nome: "iPhone 12", ano: 2020, lancamento: "Outubro de 2020",
    altura: 146.7, largura: 71.5, espessura: 7.4, peso: 162, raio: 10.6, bordasRetas: true,
    tela: { polegadas: 6.1, tipo: "OLED", resolucao: "2532 × 1170", ppi: 460, hz: 60, brilhoPico: 1200 },
    frente: "entalhe", chip: "A14 Bionic", bateriaMah: 2815, videoHoras: 17,
    cameras: "quadrado-vertical", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.6", "Ultra-angular de 12 MP, ƒ/2.4"], zoomOptico: "2x para trás", frontal: "12 MP, ƒ/2.2", lidar: false,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro", agua: "IP68 (6 m por 30 min)", armazenamento: "64, 128 e 256 GB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Preto", "#25262a", "#2f3034"), c("Branco", "#f4f4f2", "#e4e4e1"), c("Azul", "#1f4a73", "#284f78"), c("Verde", "#d4e8d1", "#c5dcc2"), c("Roxo", "#c9bfdc", "#bfb4d4"), c("(PRODUCT)RED", "#b5121b", "#a50f17")],
  },
  {
    id: "iphone-12-pro", nome: "iPhone 12 Pro", ano: 2020, lancamento: "Outubro de 2020",
    altura: 146.7, largura: 71.5, espessura: 7.4, peso: 187, raio: 10.6, bordasRetas: true,
    tela: { polegadas: 6.1, tipo: "OLED", resolucao: "2532 × 1170", ppi: 460, hz: 60, brilhoPico: 1200 },
    frente: "entalhe", chip: "A14 Bionic", bateriaMah: 2815, videoHoras: 17,
    cameras: "quadrado-triplo", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.6", "Ultra-angular de 12 MP, ƒ/2.4", "Teleobjetiva de 12 MP, ƒ/2.0"], zoomOptico: "2x", frontal: "12 MP, ƒ/2.2", lidar: true,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aco", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128, 256 e 512 GB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Grafite", "#4b4a47", "#5d5c59"), c("Prateado", "#ecece8", "#d8d9db"), c("Dourado", "#f4e3c8", "#e6c99a"), c("Azul-pacífico", "#2c4a5c", "#3a5d70")],
  },
  {
    id: "iphone-12-pro-max", nome: "iPhone 12 Pro Max", ano: 2020, lancamento: "Novembro de 2020",
    altura: 160.8, largura: 78.1, espessura: 7.4, peso: 226, raio: 11.6, bordasRetas: true,
    tela: { polegadas: 6.7, tipo: "OLED", resolucao: "2778 × 1284", ppi: 458, hz: 60, brilhoPico: 1200 },
    frente: "entalhe", chip: "A14 Bionic", bateriaMah: 3687, videoHoras: 20,
    cameras: "quadrado-triplo", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.6", "Ultra-angular de 12 MP, ƒ/2.4", "Teleobjetiva de 12 MP, ƒ/2.2"], zoomOptico: "2,5x", frontal: "12 MP, ƒ/2.2", lidar: true,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aco", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128, 256 e 512 GB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Grafite", "#4b4a47", "#5d5c59"), c("Prateado", "#ecece8", "#d8d9db"), c("Dourado", "#f4e3c8", "#e6c99a"), c("Azul-pacífico", "#2c4a5c", "#3a5d70")],
  },
  {
    id: "iphone-13-mini", nome: "iPhone 13 mini", ano: 2021, lancamento: "Setembro de 2021",
    altura: 131.5, largura: 64.2, espessura: 7.65, peso: 140, raio: 9.6, bordasRetas: true,
    tela: { polegadas: 5.4, tipo: "OLED", resolucao: "2340 × 1080", ppi: 476, hz: 60, brilhoPico: 1200 },
    frente: "entalhe-menor", chip: "A15 Bionic", bateriaMah: 2406, videoHoras: 17,
    cameras: "quadrado-diagonal", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.6", "Ultra-angular de 12 MP, ƒ/2.4"], zoomOptico: "2x para trás", frontal: "12 MP, ƒ/2.2", lidar: false,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro", agua: "IP68 (6 m por 30 min)", armazenamento: "128, 256 e 512 GB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Meia-noite", "#1f252c", "#2c3238"), c("Estelar", "#efe9e1", "#d8d2c8"), c("Azul", "#1f5a78", "#2f6684"), c("Rosa", "#f6dcd7", "#e5c3bd"), c("Verde", "#36483a", "#3f5444"), c("(PRODUCT)RED", "#b8001a", "#a10016")],
  },
  {
    id: "iphone-13", nome: "iPhone 13", ano: 2021, lancamento: "Setembro de 2021",
    altura: 146.7, largura: 71.5, espessura: 7.65, peso: 173, raio: 10.6, bordasRetas: true,
    tela: { polegadas: 6.1, tipo: "OLED", resolucao: "2532 × 1170", ppi: 460, hz: 60, brilhoPico: 1200 },
    frente: "entalhe-menor", chip: "A15 Bionic", bateriaMah: 3227, videoHoras: 19,
    cameras: "quadrado-diagonal", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.6", "Ultra-angular de 12 MP, ƒ/2.4"], zoomOptico: "2x para trás", frontal: "12 MP, ƒ/2.2", lidar: false,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro", agua: "IP68 (6 m por 30 min)", armazenamento: "128, 256 e 512 GB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Meia-noite", "#1f252c", "#2c3238"), c("Estelar", "#efe9e1", "#d8d2c8"), c("Azul", "#1f5a78", "#2f6684"), c("Rosa", "#f6dcd7", "#e5c3bd"), c("Verde", "#36483a", "#3f5444"), c("(PRODUCT)RED", "#b8001a", "#a10016")],
  },
  {
    id: "iphone-13-pro", nome: "iPhone 13 Pro", ano: 2021, lancamento: "Setembro de 2021",
    altura: 146.7, largura: 71.5, espessura: 7.65, peso: 203, raio: 10.6, bordasRetas: true,
    tela: { polegadas: 6.1, tipo: "OLED", resolucao: "2532 × 1170", ppi: 460, hz: 120, brilhoPico: 1200 },
    frente: "entalhe-menor", chip: "A15 Bionic", bateriaMah: 3095, videoHoras: 22,
    cameras: "quadrado-triplo", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.5", "Ultra-angular de 12 MP, ƒ/1.8", "Teleobjetiva de 12 MP, ƒ/2.8"], zoomOptico: "3x", frontal: "12 MP, ƒ/2.2", lidar: true,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aco", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128 GB a 1 TB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Grafite", "#54524f", "#5f5e5b"), c("Dourado", "#f5e6cc", "#e8cd9c"), c("Prateado", "#ecece8", "#d8d9db"), c("Azul-sierra", "#a7c1d9", "#9ab6cf"), c("Verde-alpino", "#5a6b5a", "#5d6e5c")],
  },
  {
    id: "iphone-13-pro-max", nome: "iPhone 13 Pro Max", ano: 2021, lancamento: "Setembro de 2021",
    altura: 160.8, largura: 78.1, espessura: 7.65, peso: 238, raio: 11.6, bordasRetas: true,
    tela: { polegadas: 6.7, tipo: "OLED", resolucao: "2778 × 1284", ppi: 458, hz: 120, brilhoPico: 1200 },
    frente: "entalhe-menor", chip: "A15 Bionic", bateriaMah: 4352, videoHoras: 28,
    cameras: "quadrado-triplo", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.5", "Ultra-angular de 12 MP, ƒ/1.8", "Teleobjetiva de 12 MP, ƒ/2.8"], zoomOptico: "3x", frontal: "12 MP, ƒ/2.2", lidar: true,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aco", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128 GB a 1 TB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Grafite", "#54524f", "#5f5e5b"), c("Dourado", "#f5e6cc", "#e8cd9c"), c("Prateado", "#ecece8", "#d8d9db"), c("Azul-sierra", "#a7c1d9", "#9ab6cf"), c("Verde-alpino", "#5a6b5a", "#5d6e5c")],
  },
  {
    id: "iphone-se-3", nome: "iPhone SE (3ª geração)", ano: 2022, lancamento: "Março de 2022",
    altura: 138.4, largura: 67.3, espessura: 7.3, peso: 144, raio: 9, bordasRetas: false,
    tela: { polegadas: 4.7, tipo: "LCD", resolucao: "1334 × 750", ppi: 326, hz: 60, brilhoPico: 625 },
    frente: "botao-inicio", chip: "A15 Bionic", bateriaMah: 2018, videoHoras: 15,
    cameras: "se", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.8"], zoomOptico: "—", frontal: "7 MP, ƒ/2.2", lidar: false,
    biometria: "Touch ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: false, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro", agua: "IP67 (1 m por 30 min)", armazenamento: "64, 128 e 256 GB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Meia-noite", "#1f252c", "#2c3238"), c("Estelar", "#efe9e1", "#d8d2c8"), c("(PRODUCT)RED", "#b8001a", "#a10016")],
  },
  {
    id: "iphone-14", nome: "iPhone 14", ano: 2022, lancamento: "Setembro de 2022",
    altura: 146.7, largura: 71.5, espessura: 7.8, peso: 172, raio: 10.6, bordasRetas: true,
    tela: { polegadas: 6.1, tipo: "OLED", resolucao: "2532 × 1170", ppi: 460, hz: 60, brilhoPico: 1200 },
    frente: "entalhe-menor", chip: "A15 Bionic (GPU de 5 núcleos)", bateriaMah: 3279, videoHoras: 20,
    cameras: "quadrado-diagonal", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.5", "Ultra-angular de 12 MP, ƒ/2.4"], zoomOptico: "2x para trás", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: false,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro", agua: "IP68 (6 m por 30 min)", armazenamento: "128, 256 e 512 GB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Meia-noite", "#222830", "#2c3238"), c("Estelar", "#efe9e1", "#d8d2c8"), c("Azul", "#a8c4dd", "#9ab8d2"), c("Roxo", "#d9cfe3", "#cbbfd8"), c("Amarelo", "#f7e7a6", "#efdc8f"), c("(PRODUCT)RED", "#b8001a", "#a10016")],
  },
  {
    id: "iphone-14-plus", nome: "iPhone 14 Plus", ano: 2022, lancamento: "Outubro de 2022",
    altura: 160.8, largura: 78.1, espessura: 7.8, peso: 203, raio: 11.6, bordasRetas: true,
    tela: { polegadas: 6.7, tipo: "OLED", resolucao: "2778 × 1284", ppi: 458, hz: 60, brilhoPico: 1200 },
    frente: "entalhe-menor", chip: "A15 Bionic (GPU de 5 núcleos)", bateriaMah: 4325, videoHoras: 26,
    cameras: "quadrado-diagonal", camerasTexto: ["Grande-angular de 12 MP, ƒ/1.5", "Ultra-angular de 12 MP, ƒ/2.4"], zoomOptico: "2x para trás", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: false,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro", agua: "IP68 (6 m por 30 min)", armazenamento: "128, 256 e 512 GB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Meia-noite", "#222830", "#2c3238"), c("Estelar", "#efe9e1", "#d8d2c8"), c("Azul", "#a8c4dd", "#9ab8d2"), c("Roxo", "#d9cfe3", "#cbbfd8"), c("Amarelo", "#f7e7a6", "#efdc8f"), c("(PRODUCT)RED", "#b8001a", "#a10016")],
  },
  {
    id: "iphone-14-pro", nome: "iPhone 14 Pro", ano: 2022, lancamento: "Setembro de 2022",
    altura: 147.5, largura: 71.5, espessura: 7.85, peso: 206, raio: 11, bordasRetas: true,
    tela: { polegadas: 6.1, tipo: "OLED", resolucao: "2556 × 1179", ppi: 460, hz: 120, brilhoPico: 2000 },
    frente: "ilha", chip: "A16 Bionic", bateriaMah: 3200, videoHoras: 23,
    cameras: "quadrado-triplo", camerasTexto: ["Principal de 48 MP, ƒ/1.78", "Ultra-angular de 12 MP, ƒ/2.2", "Teleobjetiva de 12 MP, ƒ/2.8"], zoomOptico: "3x", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: true,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aco", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128 GB a 1 TB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Roxo-profundo", "#4f4556", "#5a4f62"), c("Dourado", "#f4e8ce", "#e8cf9f"), c("Prateado", "#ecece8", "#d8d9db"), c("Preto-espacial", "#2e2c2f", "#403e41")],
  },
  {
    id: "iphone-14-pro-max", nome: "iPhone 14 Pro Max", ano: 2022, lancamento: "Setembro de 2022",
    altura: 160.7, largura: 77.6, espessura: 7.85, peso: 240, raio: 12, bordasRetas: true,
    tela: { polegadas: 6.7, tipo: "OLED", resolucao: "2796 × 1290", ppi: 460, hz: 120, brilhoPico: 2000 },
    frente: "ilha", chip: "A16 Bionic", bateriaMah: 4323, videoHoras: 29,
    cameras: "quadrado-triplo", camerasTexto: ["Principal de 48 MP, ƒ/1.78", "Ultra-angular de 12 MP, ƒ/2.2", "Teleobjetiva de 12 MP, ƒ/2.8"], zoomOptico: "3x", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: true,
    biometria: "Face ID", porta: "Lightning", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aco", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128 GB a 1 TB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Roxo-profundo", "#4f4556", "#5a4f62"), c("Dourado", "#f4e8ce", "#e8cf9f"), c("Prateado", "#ecece8", "#d8d9db"), c("Preto-espacial", "#2e2c2f", "#403e41")],
  },
  {
    id: "iphone-15", nome: "iPhone 15", ano: 2023, lancamento: "Setembro de 2023",
    altura: 147.6, largura: 71.6, espessura: 7.8, peso: 171, raio: 11, bordasRetas: true,
    tela: { polegadas: 6.1, tipo: "OLED", resolucao: "2556 × 1179", ppi: 460, hz: 60, brilhoPico: 2000 },
    frente: "ilha", chip: "A16 Bionic", bateriaMah: 3349, videoHoras: 20,
    cameras: "quadrado-diagonal", camerasTexto: ["Principal de 48 MP, ƒ/1.6", "Ultra-angular de 12 MP, ƒ/2.4"], zoomOptico: "2x (qualidade óptica)", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: false,
    biometria: "Face ID", porta: "USB-C", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128, 256 e 512 GB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Rosa", "#f3d8dc", "#e9c6cb"), c("Amarelo", "#f2ecc2", "#e6dfa9"), c("Verde", "#d6e2d2", "#c6d5c1"), c("Azul", "#cfdbe3", "#bccbd6"), c("Preto", "#35383b", "#3f4245")],
  },
  {
    id: "iphone-15-plus", nome: "iPhone 15 Plus", ano: 2023, lancamento: "Setembro de 2023",
    altura: 160.9, largura: 77.8, espessura: 7.8, peso: 201, raio: 12, bordasRetas: true,
    tela: { polegadas: 6.7, tipo: "OLED", resolucao: "2796 × 1290", ppi: 460, hz: 60, brilhoPico: 2000 },
    frente: "ilha", chip: "A16 Bionic", bateriaMah: 4383, videoHoras: 26,
    cameras: "quadrado-diagonal", camerasTexto: ["Principal de 48 MP, ƒ/1.6", "Ultra-angular de 12 MP, ƒ/2.4"], zoomOptico: "2x (qualidade óptica)", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: false,
    biometria: "Face ID", porta: "USB-C", botaoAcao: false, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128, 256 e 512 GB", conectividade: "5G, Wi-Fi 6",
    cores: [c("Rosa", "#f3d8dc", "#e9c6cb"), c("Amarelo", "#f2ecc2", "#e6dfa9"), c("Verde", "#d6e2d2", "#c6d5c1"), c("Azul", "#cfdbe3", "#bccbd6"), c("Preto", "#35383b", "#3f4245")],
  },
  {
    id: "iphone-15-pro", nome: "iPhone 15 Pro", ano: 2023, lancamento: "Setembro de 2023",
    altura: 146.6, largura: 70.6, espessura: 8.25, peso: 187, raio: 11.2, bordasRetas: true,
    tela: { polegadas: 6.1, tipo: "OLED", resolucao: "2556 × 1179", ppi: 460, hz: 120, brilhoPico: 2000 },
    frente: "ilha", chip: "A17 Pro", bateriaMah: 3274, videoHoras: 23,
    cameras: "quadrado-triplo", camerasTexto: ["Principal de 48 MP, ƒ/1.78", "Ultra-angular de 12 MP, ƒ/2.2", "Teleobjetiva de 12 MP, ƒ/2.8"], zoomOptico: "3x", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: true,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "titanio", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128 GB a 1 TB", conectividade: "5G, Wi-Fi 6E, USB 3",
    cores: [c("Titânio natural", "#c2bcb2", "#a9a49b"), c("Titânio azul", "#3d4554", "#4a5262"), c("Titânio branco", "#f0efeb", "#dcdad5"), c("Titânio preto", "#3a3a3c", "#48484a")],
  },
  {
    id: "iphone-15-pro-max", nome: "iPhone 15 Pro Max", ano: 2023, lancamento: "Setembro de 2023",
    altura: 159.9, largura: 76.7, espessura: 8.25, peso: 221, raio: 12, bordasRetas: true,
    tela: { polegadas: 6.7, tipo: "OLED", resolucao: "2796 × 1290", ppi: 460, hz: 120, brilhoPico: 2000 },
    frente: "ilha", chip: "A17 Pro", bateriaMah: 4422, videoHoras: 29,
    cameras: "quadrado-triplo", camerasTexto: ["Principal de 48 MP, ƒ/1.78", "Ultra-angular de 12 MP, ƒ/2.2", "Teleobjetiva de 12 MP, ƒ/2.8 (tetraprisma)"], zoomOptico: "5x", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: true,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: false, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "titanio", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "256 GB a 1 TB", conectividade: "5G, Wi-Fi 6E, USB 3",
    cores: [c("Titânio natural", "#c2bcb2", "#a9a49b"), c("Titânio azul", "#3d4554", "#4a5262"), c("Titânio branco", "#f0efeb", "#dcdad5"), c("Titânio preto", "#3a3a3c", "#48484a")],
  },
  {
    id: "iphone-16", nome: "iPhone 16", ano: 2024, lancamento: "Setembro de 2024",
    altura: 147.6, largura: 71.6, espessura: 7.8, peso: 170, raio: 11, bordasRetas: true,
    tela: { polegadas: 6.1, tipo: "OLED", resolucao: "2556 × 1179", ppi: 460, hz: 60, brilhoPico: 2000 },
    frente: "ilha", chip: "A18", bateriaMah: 3561, videoHoras: 22,
    cameras: "pilula-vertical", camerasTexto: ["Fusion de 48 MP, ƒ/1.6", "Ultra-angular de 12 MP, ƒ/2.2 com macro"], zoomOptico: "2x (qualidade óptica)", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: false,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: true, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128, 256 e 512 GB", conectividade: "5G, Wi-Fi 7",
    cores: [c("Ultramarino", "#5d73d6", "#6a7fdc"), c("Verde-acinzentado", "#a4c9c3", "#93bdb6"), c("Rosa", "#f2bdd6", "#eaaecb"), c("Branco", "#f4f4f2", "#e4e4e1"), c("Preto", "#2f3133", "#3a3c3e")],
  },
  {
    id: "iphone-16-plus", nome: "iPhone 16 Plus", ano: 2024, lancamento: "Setembro de 2024",
    altura: 160.9, largura: 77.8, espessura: 7.8, peso: 199, raio: 12, bordasRetas: true,
    tela: { polegadas: 6.7, tipo: "OLED", resolucao: "2796 × 1290", ppi: 460, hz: 60, brilhoPico: 2000 },
    frente: "ilha", chip: "A18", bateriaMah: 4674, videoHoras: 27,
    cameras: "pilula-vertical", camerasTexto: ["Fusion de 48 MP, ƒ/1.6", "Ultra-angular de 12 MP, ƒ/2.2 com macro"], zoomOptico: "2x (qualidade óptica)", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: false,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: true, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128, 256 e 512 GB", conectividade: "5G, Wi-Fi 7",
    cores: [c("Ultramarino", "#5d73d6", "#6a7fdc"), c("Verde-acinzentado", "#a4c9c3", "#93bdb6"), c("Rosa", "#f2bdd6", "#eaaecb"), c("Branco", "#f4f4f2", "#e4e4e1"), c("Preto", "#2f3133", "#3a3c3e")],
  },
  {
    id: "iphone-16-pro", nome: "iPhone 16 Pro", ano: 2024, lancamento: "Setembro de 2024",
    altura: 149.6, largura: 71.5, espessura: 8.25, peso: 199, raio: 11.6, bordasRetas: true,
    tela: { polegadas: 6.3, tipo: "OLED", resolucao: "2622 × 1206", ppi: 460, hz: 120, brilhoPico: 2000 },
    frente: "ilha", chip: "A18 Pro", bateriaMah: 3582, videoHoras: 27,
    cameras: "quadrado-triplo", camerasTexto: ["Fusion de 48 MP, ƒ/1.78", "Ultra-angular de 48 MP, ƒ/2.2", "Teleobjetiva de 12 MP, ƒ/2.8 (tetraprisma)"], zoomOptico: "5x", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: true,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: true, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "titanio", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128 GB a 1 TB", conectividade: "5G, Wi-Fi 7, USB 3",
    cores: [c("Titânio-deserto", "#c9b29a", "#b59c84"), c("Titânio natural", "#c2bcb2", "#a9a49b"), c("Titânio branco", "#f0efeb", "#dcdad5"), c("Titânio preto", "#3a3a3c", "#48484a")],
  },
  {
    id: "iphone-16-pro-max", nome: "iPhone 16 Pro Max", ano: 2024, lancamento: "Setembro de 2024",
    altura: 163, largura: 77.6, espessura: 8.25, peso: 227, raio: 12.4, bordasRetas: true,
    tela: { polegadas: 6.9, tipo: "OLED", resolucao: "2868 × 1320", ppi: 460, hz: 120, brilhoPico: 2000 },
    frente: "ilha", chip: "A18 Pro", bateriaMah: 4685, videoHoras: 33,
    cameras: "quadrado-triplo", camerasTexto: ["Fusion de 48 MP, ƒ/1.78", "Ultra-angular de 48 MP, ƒ/2.2", "Teleobjetiva de 12 MP, ƒ/2.8 (tetraprisma)"], zoomOptico: "5x", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: true,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: true, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "titanio", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "256 GB a 1 TB", conectividade: "5G, Wi-Fi 7, USB 3",
    cores: [c("Titânio-deserto", "#c9b29a", "#b59c84"), c("Titânio natural", "#c2bcb2", "#a9a49b"), c("Titânio branco", "#f0efeb", "#dcdad5"), c("Titânio preto", "#3a3a3c", "#48484a")],
  },
  {
    id: "iphone-16e", nome: "iPhone 16e", ano: 2025, lancamento: "Fevereiro de 2025",
    altura: 146.7, largura: 71.5, espessura: 7.8, peso: 167, raio: 10.6, bordasRetas: true,
    tela: { polegadas: 6.1, tipo: "OLED", resolucao: "2532 × 1170", ppi: 460, hz: 60, brilhoPico: 1200 },
    frente: "entalhe-menor", chip: "A18", bateriaMah: 4005, videoHoras: 26,
    cameras: "lente-unica", camerasTexto: ["Fusion de 48 MP, ƒ/1.6"], zoomOptico: "2x (qualidade óptica)", frontal: "12 MP, ƒ/1.9 com foco automático", lidar: false,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: false, magsafe: false, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "128, 256 e 512 GB", conectividade: "5G (modem Apple C1), Wi-Fi 6",
    cores: [c("Preto", "#2f3133", "#3a3c3e"), c("Branco", "#f4f4f2", "#e4e4e1")],
  },
  {
    id: "iphone-17", nome: "iPhone 17", ano: 2025, lancamento: "Setembro de 2025",
    altura: 149.6, largura: 71.5, espessura: 7.95, peso: 177, raio: 11.6, bordasRetas: true,
    tela: { polegadas: 6.3, tipo: "OLED", resolucao: "2622 × 1206", ppi: 460, hz: 120, brilhoPico: 3000 },
    frente: "ilha", chip: "A19", bateriaMah: 3692, videoHoras: 30,
    cameras: "pilula-vertical", camerasTexto: ["Fusion de 48 MP, ƒ/1.6", "Fusion ultra-angular de 48 MP, ƒ/2.2"], zoomOptico: "2x (qualidade óptica)", frontal: "18 MP Center Stage, ƒ/1.9", lidar: false,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: true, magsafe: true, camaraVapor: false, gavetaChip: true,
    material: "aluminio", traseira: "vidro-fosco", agua: "IP68 (6 m por 30 min)", armazenamento: "256 e 512 GB", conectividade: "5G, Wi-Fi 7 (chip N1)",
    cores: [c("Lavanda", "#d9cde6", "#cbbedb"), c("Sálvia", "#bfcbb1", "#b0bea1"), c("Azul-névoa", "#a9bfd6", "#9ab2cb"), c("Branco", "#f4f4f2", "#e4e4e1"), c("Preto", "#2f3133", "#3a3c3e")],
  },
  {
    id: "iphone-air", nome: "iPhone Air", ano: 2025, lancamento: "Setembro de 2025",
    altura: 156.2, largura: 74.7, espessura: 5.64, peso: 165, raio: 12.2, bordasRetas: true,
    tela: { polegadas: 6.5, tipo: "OLED", resolucao: "2736 × 1260", ppi: 460, hz: 120, brilhoPico: 3000 },
    frente: "ilha", chip: "A19 Pro", bateriaMah: 3149, videoHoras: 27,
    cameras: "barra-air", camerasTexto: ["Fusion de 48 MP, ƒ/1.6"], zoomOptico: "2x (qualidade óptica)", frontal: "18 MP Center Stage, ƒ/1.9", lidar: false,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: true, magsafe: true, camaraVapor: false, gavetaChip: false,
    material: "titanio", traseira: "vidro", agua: "IP68 (6 m por 30 min)", armazenamento: "256 GB a 1 TB", conectividade: "5G (modem Apple C1X), Wi-Fi 7, só eSIM",
    cores: [c("Azul-céu", "#d6e3ee", "#c7d6e3"), c("Dourado-claro", "#efe3cc", "#e2d1b1"), c("Branco-nuvem", "#f5f5f3", "#e6e6e3"), c("Preto-espacial", "#2a2b2d", "#3a3b3e")],
  },
  {
    id: "iphone-17-pro", nome: "iPhone 17 Pro", ano: 2025, lancamento: "Setembro de 2025",
    altura: 150, largura: 71.9, espessura: 8.75, peso: 204, raio: 11.8, bordasRetas: true,
    tela: { polegadas: 6.3, tipo: "OLED", resolucao: "2622 × 1206", ppi: 460, hz: 120, brilhoPico: 3000 },
    frente: "ilha", chip: "A19 Pro", bateriaMah: 3998, videoHoras: 31,
    cameras: "barra-pro", camerasTexto: ["Fusion de 48 MP, ƒ/1.78", "Fusion ultra-angular de 48 MP, ƒ/2.2", "Teleobjetiva de 48 MP, ƒ/2.8 (4x)"], zoomOptico: "4x (8x qualidade óptica)", frontal: "18 MP Center Stage, ƒ/1.9", lidar: true,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: true, magsafe: true, camaraVapor: true, gavetaChip: true,
    material: "aluminio", traseira: "aluminio", agua: "IP68 (6 m por 30 min)", armazenamento: "256 GB a 1 TB", conectividade: "5G, Wi-Fi 7 (chip N1), USB 3",
    cores: [c("Laranja-cósmico", "#e0763c", "#d86c33"), c("Azul-intenso", "#2f3c56", "#36445f"), c("Prateado", "#e3e4e6", "#d3d5d8")],
  },
  {
    id: "iphone-17-pro-max", nome: "iPhone 17 Pro Max", ano: 2025, lancamento: "Setembro de 2025",
    altura: 163.4, largura: 78, espessura: 8.75, peso: 231, raio: 12.6, bordasRetas: true,
    tela: { polegadas: 6.9, tipo: "OLED", resolucao: "2868 × 1320", ppi: 460, hz: 120, brilhoPico: 3000 },
    frente: "ilha", chip: "A19 Pro", bateriaMah: 4832, videoHoras: 37,
    cameras: "barra-pro", camerasTexto: ["Fusion de 48 MP, ƒ/1.78", "Fusion ultra-angular de 48 MP, ƒ/2.2", "Teleobjetiva de 48 MP, ƒ/2.8 (4x)"], zoomOptico: "4x (8x qualidade óptica)", frontal: "18 MP Center Stage, ƒ/1.9", lidar: true,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: true, magsafe: true, camaraVapor: true, gavetaChip: true,
    material: "aluminio", traseira: "aluminio", agua: "IP68 (6 m por 30 min)", armazenamento: "256 GB a 2 TB", conectividade: "5G, Wi-Fi 7 (chip N1), USB 3",
    cores: [c("Laranja-cósmico", "#e0763c", "#d86c33"), c("Azul-intenso", "#2f3c56", "#36445f"), c("Prateado", "#e3e4e6", "#d3d5d8")],
  },
  {
    id: "iphone-18-pro", nome: "iPhone 18 Pro", ano: 2026, lancamento: "Setembro de 2026",
    altura: 150, largura: 71.9, espessura: 8.75, peso: 211, raio: 11.8, bordasRetas: true,
    tela: { polegadas: 6.3, tipo: "OLED", resolucao: "2622 × 1206", ppi: 460, hz: 120, brilhoPico: 3000 },
    frente: "ilha-menor", chip: "A20 Pro", bateriaMah: 4288, videoHoras: 36,
    cameras: "barra-pro", camerasTexto: ["Fusion de 48 MP com abertura variável, ƒ/1.48 a ƒ/4", "Ultra-angular de 48 MP, ƒ/2.2", "Teleobjetiva de 48 MP, ƒ/2.8 (4x)"], zoomOptico: "4x (8x qualidade óptica)", frontal: "18 MP Center Stage, ƒ/1.9", lidar: true,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: true, magsafe: true, camaraVapor: true, gavetaChip: true,
    material: "aluminio", traseira: "aluminio", agua: "IP68 (6 m por 30 min)", armazenamento: "256 GB a 2 TB", conectividade: "5G (modem Apple C2), Wi-Fi 7 (chip N1)",
    cores: [c("Bordô", "#5c1f2b", "#682734"), c("Glacial", "#d7e2ea", "#c8d5df"), c("Prateado", "#e3e4e6", "#d3d5d8"), c("Preto", "#2b2c2f", "#37383b")],
  },
  {
    id: "iphone-18-pro-max", nome: "iPhone 18 Pro Max", ano: 2026, lancamento: "Setembro de 2026",
    altura: 163.4, largura: 78, espessura: 8.75, peso: 249, raio: 12.6, bordasRetas: true,
    tela: { polegadas: 6.9, tipo: "OLED", resolucao: "2868 × 1320", ppi: 460, hz: 120, brilhoPico: 3000 },
    frente: "ilha-menor", chip: "A20 Pro", bateriaMah: 5567, videoHoras: 45,
    cameras: "barra-pro", camerasTexto: ["Fusion de 48 MP com abertura variável, ƒ/1.48 a ƒ/4", "Ultra-angular de 48 MP, ƒ/2.2", "Teleobjetiva de 48 MP, ƒ/2.8 (4x)"], zoomOptico: "4x (8x qualidade óptica)", frontal: "18 MP Center Stage, ƒ/1.9", lidar: true,
    biometria: "Face ID", porta: "USB-C", botaoAcao: true, controleCamera: true, magsafe: true, camaraVapor: true, gavetaChip: true,
    material: "aluminio", traseira: "aluminio", agua: "IP68 (6 m por 30 min)", armazenamento: "256 GB a 2 TB", conectividade: "5G (modem Apple C2), Wi-Fi 7 (chip N1)",
    cores: [c("Bordô", "#5c1f2b", "#682734"), c("Glacial", "#d7e2ea", "#c8d5df"), c("Prateado", "#e3e4e6", "#d3d5d8"), c("Preto", "#2b2c2f", "#37383b")],
  },
  {
    // Medidas do aparelho fechado; aberto ele fica com 164,6 mm de largura e 5,2 mm de espessura.
    id: "iphone-duo", nome: "iPhone Duo (dobrável)", ano: 2026, lancamento: "Setembro de 2026",
    altura: 117.8, largura: 84.1, espessura: 11.3, peso: 254, raio: 12, bordasRetas: true,
    tela: { polegadas: 7.6, tipo: "OLED", resolucao: "2670 × 1878", ppi: 430, hz: 120, brilhoPico: 3000 },
    telaExterna: { polegadas: 5.4, resolucao: "2034 × 1398" },
    frente: "dobravel", chip: "A20 Pro", bateriaMah: 5400, videoHoras: 24,
    cameras: "barra-duo", camerasTexto: ["Fusion de 48 MP", "Ultra-angular de 48 MP"], zoomOptico: "2x (qualidade óptica)", frontal: "12 MP (tela externa) e câmera sob a tela interna", lidar: false,
    biometria: "Touch ID", porta: "USB-C", botaoAcao: true, controleCamera: true, magsafe: true, camaraVapor: true, gavetaChip: false,
    material: "titanio", traseira: "vidro", agua: "IP68", armazenamento: "256 GB a 2 TB", conectividade: "5G (modem Apple C2), Wi-Fi 7, só eSIM",
    cores: [c("Céu noturno", "#23252b", "#3a3c42"), c("Branco-estelar", "#f2f1ec", "#d9d8d2")],
  },
];

export const modeloPorId = (id: string) => MODELOS.find((m) => m.id === id);

// Lista agrupada por ano, do mais novo para o mais antigo, para os seletores.
export function modelosPorAno() {
  const anos = [...new Set(MODELOS.map((m) => m.ano))].sort((a, b) => b - a);
  return anos.map((ano) => ({ ano, modelos: MODELOS.filter((m) => m.ano === ano) }));
}

// resumo: uma linha curta com os números principais, mostrada ao passar o mouse.
export type InfoPeca = { id: string; nome: string; descricao: string; detalhes: string[]; resumo?: string };

const MATERIAL: Record<Material, string> = { aluminio: "Alumínio", aco: "Aço inoxidável", titanio: "Titânio" };
export const nomeMaterial = (m: Material) => MATERIAL[m];

// Descrição das peças montada a partir da ficha de cada modelo.
export function pecasDoModelo(m: ModeloIphone): InfoPeca[] {
  const dobravel = m.frente === "dobravel";
  const p: InfoPeca[] = [];
  p.push({
    id: "tela",
    nome: dobravel ? "Tela interna dobrável" : m.tela.tipo === "LCD" ? "Tela Liquid Retina (LCD)" : "Tela Super Retina XDR",
    descricao: dobravel
      ? "Painel OLED flexível que dobra ao meio junto com a dobradiça, quase sem vinco aparente."
      : m.tela.tipo === "LCD"
        ? "Painel LCD com vidro frontal temperado. Mais simples que o OLED, com preto menos profundo."
        : `Painel OLED de ${fmt(m.tela.polegadas)}" com pretos perfeitos e alto contraste${m.tela.hz > 60 ? ", com ProMotion de até 120 Hz" : ""}.`,
    detalhes: [`${fmt(m.tela.polegadas)}", ${m.tela.resolucao}, ${m.tela.ppi} ppi`, `Brilho de até ${m.tela.brilhoPico} nits`, m.tela.hz > 60 ? "ProMotion até 120 Hz" : "Taxa de atualização de 60 Hz"],
  });
  if (m.telaExterna) {
    p.push({
      id: "tela-externa",
      nome: "Tela externa",
      descricao: "Tela para usar o aparelho fechado, como um iPhone compacto.",
      detalhes: [`${fmt(m.telaExterna.polegadas)}", ${m.telaExterna.resolucao}`, "OLED com ProMotion"],
    });
    p.push({
      id: "dobradica",
      nome: "Dobradiça",
      descricao: "Dobradiça em titânio e aço que permite abrir e fechar o aparelho, mantendo a tela interna protegida.",
      detalhes: ["Aberto: 5,2 mm de espessura", "Fechado: 11,3 mm de espessura"],
    });
  }
  if (m.frente === "botao-inicio") {
    p.push({
      id: "inicio",
      nome: "Botão de início com Touch ID",
      descricao: "Botão sensível à pressão com leitor de digital (Touch ID) em cristal de safira.",
      detalhes: ["Touch ID de 2ª geração", "Desbloqueio e Apple Pay pela digital"],
    });
    p.push({ id: "frontal", nome: "Câmera frontal e alto-falante", descricao: "Câmera de selfie e alto-falante auricular na borda superior.", detalhes: [m.frontal] });
  } else if (!dobravel) {
    const ilha = m.frente.startsWith("ilha");
    p.push({
      id: "truedepth",
      nome: "Câmera frontal TrueDepth",
      descricao: ilha
        ? "Fica dentro da Dynamic Island: câmera de selfie e sensores do Face ID. A ilha também mostra alertas e Atividades ao Vivo."
        : "Conjunto do entalhe da tela: câmera de selfie, projetor de pontos e câmera infravermelha do Face ID.",
      detalhes: [m.frontal, "Face ID com mapeamento 3D do rosto", ...(m.frente === "ilha-menor" ? ["Dynamic Island menor, com até 3 Atividades ao Vivo"] : [])],
    });
    p.push({ id: "auricular", nome: "Alto-falante auricular", descricao: "Alto-falante de chamadas que também faz o som estéreo junto com o inferior.", detalhes: ["Som estéreo"] });
  }
  p.push({
    id: "bateria",
    nome: "Bateria",
    descricao: dobravel ? "Duas células, uma em cada metade, ligadas em conjunto." : "Bateria de íon-lítio colada no chassi, com abas de remoção.",
    detalhes: [`${m.bateriaMah.toLocaleString("pt-BR")} mAh`, `Até ${m.videoHoras} h de reprodução de vídeo`],
  });
  if (m.camaraVapor) {
    p.push({ id: "vapor", nome: "Câmara de vapor", descricao: "Placa de cobre com líquido que evapora e condensa, espalhando o calor do chip para manter o desempenho.", detalhes: ["Resfriamento do chip em uso intenso"] });
  }
  p.push({ id: "taptic", nome: "Taptic Engine", descricao: "Motor de vibração linear que gera as respostas táteis do sistema.", detalhes: ["Vibração precisa e silenciosa"] });
  p.push({ id: "altofalante", nome: "Alto-falante inferior", descricao: "Alto-falante principal, na base do aparelho.", detalhes: ["Som estéreo com o auricular"] });
  p.push({
    id: "porta",
    nome: m.porta === "USB-C" ? "Conector USB-C" : "Conector Lightning",
    descricao: `Porta ${m.porta} para carregar e transferir dados, ligada à placa por um cabo flexível com os microfones.`,
    detalhes: [m.porta === "USB-C" ? (m.conectividade.includes("USB 3") ? "USB 3 (até 10 Gb/s)" : "USB 2 (até 480 Mb/s)") : "Lightning (USB 2)", "Microfones inferiores no mesmo conjunto"],
  });
  p.push({
    id: "placa",
    nome: `Placa lógica com chip ${m.chip.split(" (")[0]}`,
    descricao: "O \"cérebro\" do iPhone: processador, memória, armazenamento, modem e demais componentes.",
    detalhes: [`Chip ${m.chip}`, m.conectividade, `Armazenamento: ${m.armazenamento}`],
  });
  p.push({
    id: "estrutura",
    nome: m.traseira === "aluminio" ? "Corpo unibody de alumínio" : `Estrutura de ${nomeMaterial(m.material).toLowerCase()}`,
    descricao:
      m.traseira === "aluminio"
        ? "Corpo de alumínio em peça única que envolve as laterais e a traseira, ajudando a dissipar o calor."
        : `Aro de ${nomeMaterial(m.material).toLowerCase()} ${m.bordasRetas ? "com laterais retas" : "com laterais arredondadas"}. As faixas nas laterais são as antenas.`,
    detalhes: [`Material: ${nomeMaterial(m.material)}`, `Resistência à água: ${m.agua}`],
  });
  const botoes = ["Botão lateral à direita", "Botões de volume à esquerda"];
  if (m.botaoAcao) botoes.push("Botão de Ação (personalizável)");
  else botoes.push("Chave de toque/silencioso");
  if (m.controleCamera) botoes.push("Controle da Câmera (botão sensível ao toque)");
  p.push({ id: "botoes", nome: "Botões laterais", descricao: "Botões físicos nas laterais do aparelho.", detalhes: botoes });
  if (m.gavetaChip) p.push({ id: "sim", nome: "Gaveta do chip SIM", descricao: "Gaveta do chip nano-SIM na lateral. Também aceita eSIM.", detalhes: ["Nano-SIM + eSIM"] });
  p.push({ id: "cameras", nome: "Câmeras traseiras", descricao: `Sistema com ${extenso(m.camerasTexto.length)} câmera${m.camerasTexto.length > 1 ? "s" : ""} traseira${m.camerasTexto.length > 1 ? "s" : ""}.`, detalhes: [...m.camerasTexto, `Zoom óptico: ${m.zoomOptico}`, ...(m.lidar ? ["Scanner LiDAR"] : [])] });
  if (m.magsafe) p.push({ id: "magsafe", nome: "Bobina MagSafe", descricao: "Bobina de carregamento sem fio com anel de ímãs para alinhar carregadores e acessórios MagSafe.", detalhes: ["Carregamento sem fio MagSafe e Qi"] });
  else p.push({ id: "magsafe", nome: "Bobina de carregamento sem fio", descricao: "Bobina de carregamento sem fio Qi (sem os ímãs do MagSafe).", detalhes: ["Carregamento sem fio Qi"] });
  p.push({
    id: "traseira",
    nome: m.traseira === "aluminio" ? "Janela de vidro traseira" : "Vidro traseiro",
    descricao:
      m.traseira === "aluminio"
        ? "Recorte de vidro Ceramic Shield na traseira de alumínio, por onde passa o carregamento sem fio."
        : m.traseira === "vidro-fosco"
          ? "Traseira em vidro texturizado fosco, com a cor aplicada no próprio vidro."
          : "Traseira em vidro brilhante, que permite o carregamento sem fio.",
    detalhes: ["Inclui o vidro das lentes e o flash True Tone"],
  });
  return p.map((x) => ({ ...x, resumo: resumoPeca(m, x.id) }));
}

// Linha curta com os números de cada peça: "Bateria de 3.227 mAh · até 19 h de vídeo".
function resumoPeca(m: ModeloIphone, id: string): string {
  const megas = m.camerasTexto.map((t) => t.match(/(\d+) MP/)?.[1]).filter(Boolean);
  const frontalMP = m.frontal.match(/(\d+) MP/)?.[1];
  switch (id) {
    case "tela":
      return `${fmt(m.tela.polegadas)}" ${m.tela.tipo} · ${m.tela.hz > 60 ? "120 Hz" : "60 Hz"} · até ${fmt(m.tela.brilhoPico)} nits`;
    case "tela-externa":
      return m.telaExterna ? `${fmt(m.telaExterna.polegadas)}" OLED · ${m.telaExterna.resolucao}` : "";
    case "dobradica":
      return "Aberto: 5,2 mm · fechado: 11,3 mm";
    case "inicio":
      return "Leitor de digital Touch ID";
    case "frontal":
    case "truedepth":
      return `Câmera de ${frontalMP ?? "?"} MP${m.biometria === "Face ID" ? " · Face ID" : ""}`;
    case "auricular":
    case "altofalante":
      return "Som estéreo";
    case "bateria":
      return `${fmt(m.bateriaMah)} mAh · até ${m.videoHoras} h de vídeo`;
    case "vapor":
      return "Resfria o chip em uso pesado";
    case "taptic":
      return "Vibração tátil precisa";
    case "porta":
      return m.porta === "USB-C" ? `USB-C · ${m.conectividade.includes("USB 3") ? "até 10 Gb/s" : "até 480 Mb/s"}` : "Lightning · até 480 Mb/s";
    case "placa":
      return `Chip ${m.chip.split(" (")[0]} · ${m.armazenamento}`;
    case "estrutura":
      return `${nomeMaterial(m.material)} · ${m.agua.split(" (")[0]}`;
    case "botoes":
      return ["Volume", "Lateral", m.botaoAcao ? "Ação" : "Silencioso", ...(m.controleCamera ? ["Controle da Câmera"] : [])].join(" · ");
    case "sim":
      return "Nano-SIM + eSIM";
    case "cameras":
      return `${megas.map((n) => `${n} MP`).join(" + ")}${m.zoomOptico !== "—" ? ` · zoom ${m.zoomOptico.split(" (")[0]}` : ""}${m.lidar ? " · LiDAR" : ""}`;
    case "magsafe":
      return m.magsafe ? "Carregamento sem fio MagSafe" : "Carregamento sem fio Qi";
    case "traseira":
      return m.traseira === "aluminio" ? "Vidro Ceramic Shield" : m.traseira === "vidro-fosco" ? "Vidro fosco colorido" : "Vidro brilhante";
    default:
      return "";
  }
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}
function extenso(n: number) {
  return ["", "uma", "duas", "três"][n] ?? String(n);
}
