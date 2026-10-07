// Cores e peças do iPhone 13 mostradas na Vitrine 3D (sem depender do three.js, para uso no servidor).

export type CorIphone = { id: string; nome: string; traseira: string; aro: string };

export const CORES_IPHONE13: CorIphone[] = [
  { id: "meia-noite", nome: "Meia-noite", traseira: "#1f252c", aro: "#2c3238" },
  { id: "estelar", nome: "Estelar", traseira: "#efe9e1", aro: "#d8d2c8" },
  { id: "azul", nome: "Azul", traseira: "#1f5a78", aro: "#2f6684" },
  { id: "rosa", nome: "Rosa", traseira: "#f6dcd7", aro: "#e5c3bd" },
  { id: "verde", nome: "Verde", traseira: "#36483a", aro: "#3f5444" },
  { id: "red", nome: "(PRODUCT)RED", traseira: "#b8001a", aro: "#a10016" },
];

export type InfoPeca = { id: string; nome: string; descricao: string; detalhes: string[] };

export const PECAS_IPHONE13: InfoPeca[] = [
  {
    id: "tela",
    nome: "Tela Super Retina XDR",
    descricao: "Painel OLED de 6,1 polegadas protegido pelo vidro Ceramic Shield, mais resistente a quedas que qualquer vidro de smartphone.",
    detalhes: ["2532 × 1170 pixels, 460 ppi", "Brilho de até 1200 nits (HDR)", "True Tone e ampla gama de cores (P3)"],
  },
  {
    id: "truedepth",
    nome: "Câmera frontal TrueDepth",
    descricao: "Conjunto do entalhe da tela: câmera de selfie, projetor de pontos e câmera infravermelha usados pelo Face ID.",
    detalhes: ["Câmera de 12 MP, abertura ƒ/2.2", "Face ID com mapeamento 3D do rosto", "Modo Cinema e vídeo 4K Dolby Vision"],
  },
  {
    id: "auricular",
    nome: "Alto-falante auricular",
    descricao: "Alto-falante de chamadas que também trabalha com o alto-falante inferior para o som estéreo.",
    detalhes: ["Som estéreo em conjunto com o alto-falante inferior", "Suporte a áudio espacial e Dolby Atmos"],
  },
  {
    id: "bateria",
    nome: "Bateria",
    descricao: "Bateria de íon-lítio em formato de L, que aproveita o espaço ao redor da placa e das câmeras.",
    detalhes: ["3227 mAh", "Até 19 horas de reprodução de vídeo", "Carga rápida: 50% em cerca de 30 min (20 W)"],
  },
  {
    id: "taptic",
    nome: "Taptic Engine",
    descricao: "Motor de vibração linear que gera as respostas táteis do sistema, como toques ao digitar e alertas.",
    detalhes: ["Vibração precisa e silenciosa", "Resposta tátil em todo o iOS"],
  },
  {
    id: "altofalante",
    nome: "Alto-falante inferior",
    descricao: "Alto-falante principal, na base do aparelho, ao lado do conector Lightning.",
    detalhes: ["Som estéreo com o auricular", "Grade com proteção contra respingos"],
  },
  {
    id: "lightning",
    nome: "Conector Lightning",
    descricao: "Porta de carregamento e dados, ligada à placa principal por um cabo flexível que também leva os microfones.",
    detalhes: ["Carregamento com fio e transferência de dados", "Microfones inferiores no mesmo conjunto"],
  },
  {
    id: "placa",
    nome: "Placa lógica com chip A15 Bionic",
    descricao: "O \"cérebro\" do iPhone: processador, memória, armazenamento, modem 5G e demais componentes.",
    detalhes: ["Chip A15 Bionic (CPU de 6 núcleos, GPU de 4 núcleos)", "Neural Engine de 16 núcleos", "5G, Wi-Fi 6 e Bluetooth 5.0", "128 GB, 256 GB ou 512 GB"],
  },
  {
    id: "estrutura",
    nome: "Estrutura de alumínio",
    descricao: "Aro de alumínio de padrão aeroespacial com laterais retas. Também funciona como antena (as faixas nas laterais).",
    detalhes: ["Alumínio de padrão aeroespacial", "Resistência à água IP68 (até 6 m por 30 min)"],
  },
  {
    id: "botoes",
    nome: "Botões laterais",
    descricao: "Botão lateral (liga/desliga e Siri), botões de volume e a chave de silencioso.",
    detalhes: ["Botão lateral à direita", "Volume e chave de toque/silencioso à esquerda"],
  },
  {
    id: "sim",
    nome: "Gaveta do chip SIM",
    descricao: "Gaveta para o chip nano-SIM, na lateral esquerda. O iPhone 13 também aceita eSIM.",
    detalhes: ["Nano-SIM + eSIM (dois números)", "Abre com a ferramenta de ejeção"],
  },
  {
    id: "cameras",
    nome: "Câmeras traseiras",
    descricao: "Sistema de câmera dupla em diagonal: grande-angular com estabilização por deslocamento do sensor e ultra-angular.",
    detalhes: ["Grande-angular de 12 MP, ƒ/1.6", "Ultra-angular de 12 MP, ƒ/2.4, campo de visão de 120°", "Modo Noite, Estilos Fotográficos e Modo Cinema"],
  },
  {
    id: "magsafe",
    nome: "Bobina MagSafe",
    descricao: "Bobina de carregamento sem fio cercada por um anel de ímãs que alinha carregadores, capas e carteiras MagSafe.",
    detalhes: ["Carregamento MagSafe de até 15 W", "Carregamento Qi de até 7,5 W"],
  },
  {
    id: "traseira",
    nome: "Vidro traseiro",
    descricao: "Traseira em vidro com cor aplicada por dentro, que permite o carregamento sem fio. Inclui o vidro das lentes e o flash True Tone.",
    detalhes: ["Vidro com cor integrada", "Flash True Tone e microfone traseiro no módulo"],
  },
];
