import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { CorIphone, ModeloIphone } from "./modelos";

// Monta em 3D qualquer iPhone da ficha técnica, peça por peça, em milímetros.
// Eixos: x = largura (direita de quem olha a tela), y = altura, z = espessura (+z = tela, −z = traseira).
// As peças são aproximações didáticas para demonstração ao cliente, não desenhos técnicos da Apple.

export type IphoneMontado = {
  modelo: ModeloIphone;
  grupo: THREE.Group;
  // Cada peça pode ter mais de um grupo (no dobrável, uma parte em cada metade).
  pecas: Map<string, THREE.Object3D[]>;
  largura: number; // largura ocupada na cena (o dobrável aberto é mais largo)
  definirExplosao: (t: number) => void;
  definirDobra: (t: number) => void;
  definirCor: (cor: CorIphone) => void;
  destacar: (id: string | null) => void;
  realcar: (id: string | null) => void;
  descartar: () => void;
};

// Quanto cada peça se afasta (em mm) na vista explodida. Peças da frente vão para +z, as de trás para −z.
const EXPLOSAO: Record<string, [number, number, number]> = {
  tela: [0, 0, 124],
  "tela-externa": [0, 0, -112],
  inicio: [0, -10, 104],
  frontal: [0, 10, 90],
  truedepth: [0, 8, 88],
  auricular: [0, 16, 98],
  vapor: [0, 6, 64],
  bateria: [0, 0, 48],
  taptic: [-6, -12, 62],
  altofalante: [8, -12, 62],
  porta: [0, -20, 70],
  placa: [0, 6, 24],
  dobradica: [0, 0, 18],
  estrutura: [0, 0, 0],
  botoes: [0, 0, 0],
  sim: [-30, 0, 0],
  cameras: [0, 4, -34],
  magsafe: [0, 0, -58],
  traseira: [0, 0, -88],
};
const EXPLOSAO_BOTAO = 16;

type Ponto = { u: number; v: number; r: number };
type LayoutCamera = {
  plato?: { u: number; v: number; w: number; h: number; r: number };
  lentes: Ponto[];
  flash: Ponto;
  lidar?: Ponto;
  mic: Ponto;
  anelSemPlato?: boolean;
};

// Posições das câmeras em coordenadas da traseira: u a partir da borda esquerda (olhando a traseira), v a partir do topo.
function layoutCameras(m: ModeloIphone): LayoutCamera {
  const W = m.largura;
  const maior = m.largura > 75;
  switch (m.cameras) {
    case "lente-unica":
      return { lentes: [{ u: 11.5, v: 11.5, r: 5.4 }], flash: { u: 22.5, v: 11.5, r: 1.8 }, mic: { u: 17.4, v: 11.5, r: 0.45 }, anelSemPlato: true };
    case "se":
      return { lentes: [{ u: 9.5, v: 9.5, r: 4.4 }], flash: { u: 18.5, v: 9.5, r: 1.7 }, mic: { u: 14.4, v: 9.5, r: 0.4 }, anelSemPlato: true };
    case "pilula-dupla":
      return {
        plato: { u: 10.8, v: 17.5, w: 12.6, h: 27, r: 6.3 },
        lentes: [{ u: 10.8, v: 10.6, r: 4.9 }, { u: 10.8, v: 24.4, r: 4.9 }],
        flash: { u: 20, v: 17.5, r: 1.8 },
        mic: { u: 20, v: 12.5, r: 0.45 },
      };
    case "quadrado-vertical": {
      const P = m.bordasRetas ? (m.largura < 66 ? 26 : 27.5) : 30.5;
      const o = 4.2;
      return {
        plato: { u: o + P / 2, v: o + P / 2, w: P, h: P, r: P * 0.24 },
        lentes: [{ u: o + P * 0.3, v: o + P * 0.29, r: P * 0.19 }, { u: o + P * 0.3, v: o + P * 0.71, r: P * 0.19 }],
        flash: { u: o + P * 0.74, v: o + P * 0.28, r: P * 0.07 },
        mic: { u: o + P * 0.74, v: o + P * 0.62, r: 0.45 },
      };
    }
    case "quadrado-diagonal": {
      const P = m.ano >= 2023 ? 27.5 : m.largura < 66 ? 24 : 25.4;
      const o = 4;
      return {
        plato: { u: o + P / 2, v: o + P / 2, w: P, h: P, r: P * 0.26 },
        lentes: [{ u: o + P * 0.28, v: o + P * 0.28, r: P * 0.23 }, { u: o + P * 0.72, v: o + P * 0.72, r: P * 0.23 }],
        flash: { u: o + P * 0.74, v: o + P * 0.26, r: P * 0.075 },
        mic: { u: o + P * 0.27, v: o + P * 0.74, r: 0.45 },
      };
    }
    case "quadrado-triplo": {
      const P = (m.ano <= 2020 ? 32.5 : 36.5) + (maior ? 1.2 : 0) + (m.ano >= 2024 ? 1 : 0);
      const o = 3.8;
      return {
        plato: { u: o + P / 2, v: o + P / 2, w: P, h: P, r: P * 0.23 },
        lentes: [
          { u: o + P * 0.28, v: o + P * 0.27, r: P * 0.2 },
          { u: o + P * 0.28, v: o + P * 0.73, r: P * 0.2 },
          { u: o + P * 0.72, v: o + P * 0.5, r: P * 0.2 },
        ],
        flash: { u: o + P * 0.74, v: o + P * 0.15, r: P * 0.06 },
        lidar: m.lidar ? { u: o + P * 0.74, v: o + P * 0.85, r: P * 0.06 } : undefined,
        mic: { u: o + P * 0.5, v: o + P * 0.5, r: 0.4 },
      };
    }
    case "pilula-vertical": {
      const o = 4;
      return {
        plato: { u: o + 12, v: o + 15.5, w: 24, h: 31, r: 7 },
        lentes: [{ u: o + 7.6, v: o + 8.4, r: 5.3 }, { u: o + 7.6, v: o + 22.6, r: 5.3 }],
        flash: { u: o + 18.2, v: o + 9.4, r: 1.8 },
        mic: { u: o + 18.2, v: o + 21, r: 0.45 },
      };
    }
    case "barra-pro": {
      const P = 38 + (maior ? 1.5 : 0);
      const o = 3;
      return {
        plato: { u: W / 2, v: 21.5 + (maior ? 0.8 : 0), w: W - 0.4, h: 43 + (maior ? 1.6 : 0), r: m.raio },
        lentes: [
          { u: o + P * 0.28, v: o + P * 0.27, r: P * 0.2 },
          { u: o + P * 0.28, v: o + P * 0.73, r: P * 0.2 },
          { u: o + P * 0.72, v: o + P * 0.5, r: P * 0.2 },
        ],
        flash: { u: W - 12, v: 13, r: 2.2 },
        lidar: { u: W - 12, v: 28, r: 2.2 },
        mic: { u: W - 19, v: 20.5, r: 0.45 },
      };
    }
    case "barra-air":
      return {
        plato: { u: W / 2, v: 15, w: W - 7, h: 21, r: 10.5 },
        lentes: [{ u: 15, v: 15, r: 6.4 }],
        flash: { u: 30, v: 15, r: 1.9 },
        mic: { u: 36, v: 15, r: 0.45 },
      };
    case "barra-duo":
      return {
        plato: { u: W / 2, v: 13, w: W - 8, h: 17, r: 8.5 },
        lentes: [{ u: 14, v: 13, r: 5.6 }, { u: 30, v: 13, r: 5.6 }],
        flash: { u: 43, v: 13, r: 1.9 },
        mic: { u: 49, v: 13, r: 0.45 },
      };
  }
}

function retanguloArredondado(w: number, h: number, r: number, cx = 0, cy = 0, cantos: [boolean, boolean, boolean, boolean] = [true, true, true, true]) {
  // cantos: [inferior esquerdo, inferior direito, superior direito, superior esquerdo]
  const s = new THREE.Shape();
  const x = cx - w / 2;
  const y = cy - h / 2;
  r = Math.max(0.01, Math.min(r, w / 2, h / 2));
  const [ie, id, sd, se] = cantos.map((c) => (c ? r : 0));
  s.moveTo(x + ie, y);
  s.lineTo(x + w - id, y);
  if (id) s.quadraticCurveTo(x + w, y, x + w, y + id);
  s.lineTo(x + w, y + h - sd);
  if (sd) s.quadraticCurveTo(x + w, y + h, x + w - sd, y + h);
  s.lineTo(x + se, y + h);
  if (se) s.quadraticCurveTo(x, y + h, x, y + h - se);
  s.lineTo(x, y + ie);
  if (ie) s.quadraticCurveTo(x, y, x + ie, y);
  return s;
}

function caminhoDe(forma: THREE.Shape) {
  const p = new THREE.Path();
  p.setFromPoints(forma.getPoints(12).reverse());
  return p;
}

function extrudar(forma: THREE.Shape, z0: number, z1: number, bisel = 0) {
  const prof = Math.max(z1 - z0 - bisel * 2, 0.01);
  const g = new THREE.ExtrudeGeometry(forma, { depth: prof, bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 4, curveSegments: 16 });
  g.translate(0, 0, z0 + bisel);
  return g;
}

function caixa(w: number, h: number, d: number, x: number, y: number, z: number, raio = 0.4) {
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.max(0.01, Math.min(raio, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)));
  g.translate(x, y, z);
  return g;
}

// Cilindro com o eixo em z.
function cilindro(r: number, d: number, x: number, y: number, z: number, segs = 40) {
  const g = new THREE.CylinderGeometry(r, r, d, segs);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

function anel(rExt: number, rInt: number, z0: number, z1: number, x = 0, y = 0) {
  const s = new THREE.Shape();
  s.absarc(x, y, rExt, 0, Math.PI * 2, false);
  const furo = new THREE.Path();
  furo.absarc(x, y, rInt, 0, Math.PI * 2, true);
  s.holes.push(furo);
  return extrudar(s, z0, z1);
}

// Ajusta as coordenadas de textura de uma geometria plana para um retângulo (x0..x1, y0..y1).
function mapearUV(g: THREE.BufferGeometry, x0: number, x1: number, y0: number, y1: number) {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - x0) / (x1 - x0), (pos.getY(i) - y0) / (y1 - y0));
}

function textura(largura: number, altura: number, desenhar: (c: CanvasRenderingContext2D, W: number, H: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  desenhar(canvas.getContext("2d")!, largura, altura);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const FONTE = `-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;

// Tela de bloqueio com papel de parede na cor do aparelho, hora e o recorte da câmera frontal.
function texturaTela(w: number, h: number, frente: ModeloIphone["frente"], cor: string, paisagem = false) {
  const px = 7;
  return textura(Math.round(w * px), Math.round(h * px), (c, W, H) => {
    const base = new THREE.Color(cor);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);
    const tom = (l: number, s = Math.max(hsl.s, 0.35)) => `hsl(${Math.round(hsl.h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
    const fundo = c.createLinearGradient(0, 0, W * 0.5, H);
    fundo.addColorStop(0, "#070b18");
    fundo.addColorStop(0.45, tom(0.22));
    fundo.addColorStop(0.8, tom(0.42));
    fundo.addColorStop(1, tom(0.55));
    c.fillStyle = fundo;
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(0, H * (0.55 + i * 0.08));
      c.bezierCurveTo(W * 0.3, H * (0.45 + i * 0.07), W * 0.7, H * (0.7 + i * 0.05), W, H * (0.5 + i * 0.09));
      c.lineTo(W, H);
      c.lineTo(0, H);
      c.closePath();
      c.fillStyle = `rgba(255,255,255,${0.03 + i * 0.012})`;
      c.fill();
    }
    const L = paisagem ? H : W;
    c.fillStyle = "rgba(255,255,255,0.95)";
    c.textAlign = "center";
    c.font = `600 ${L * 0.05}px ${FONTE}`;
    c.fillText("terça-feira, 9 de setembro", W / 2, H * (paisagem ? 0.22 : 0.16));
    c.font = `300 ${L * 0.26}px ${FONTE}`;
    c.fillText("9:41", W / 2, H * (paisagem ? 0.48 : 0.3));
    c.fillStyle = "rgba(255,255,255,0.9)";
    const bw = L * 0.36;
    if (frente !== "botao-inicio") {
      c.beginPath();
      c.roundRect((W - bw) / 2, H * 0.975, bw, H * 0.006, H * 0.003);
      c.fill();
      for (const x of [W * 0.16, W * 0.84]) {
        c.beginPath();
        c.arc(x, H * 0.91, L * 0.065, 0, Math.PI * 2);
        c.fillStyle = "rgba(20,20,30,0.45)";
        c.fill();
      }
    }
    c.fillStyle = "#000";
    if (frente === "entalhe" || frente === "entalhe-menor") {
      const nw = W * (frente === "entalhe" ? 0.55 : 0.43);
      const nh = H * 0.036;
      c.beginPath();
      c.roundRect((W - nw) / 2, -nh, nw, nh * 2, nh * 0.9);
      c.fill();
      c.beginPath();
      c.arc(W / 2 + nw * 0.24, nh * 0.5, nh * 0.22, 0, Math.PI * 2);
      c.fillStyle = "#101826";
      c.fill();
    } else if (frente === "ilha" || frente === "ilha-menor") {
      const iw = W * (frente === "ilha" ? 0.32 : 0.25);
      const ih = H * 0.042;
      c.beginPath();
      c.roundRect((W - iw) / 2, H * 0.013, iw, ih, ih / 2);
      c.fill();
      c.beginPath();
      c.arc(W / 2 + iw / 2 - ih / 2, H * 0.013 + ih / 2, ih * 0.22, 0, Math.PI * 2);
      c.fillStyle = "#111a2b";
      c.fill();
    } else if (frente === "dobravel" && !paisagem) {
      // Câmera em furo na tela externa.
      c.beginPath();
      c.arc(W / 2, H * 0.035, W * 0.025, 0, Math.PI * 2);
      c.fill();
    }
  });
}

function texturaTexto(linhas: { texto: string; tamanho: number; peso?: number; y: number }[], fundo: [string, string], tinta: string, w = 256, h = 256) {
  return textura(w, h, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, fundo[0]);
    g.addColorStop(1, fundo[1]);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = tinta;
    c.textAlign = "center";
    for (const l of linhas) {
      c.font = `${l.peso ?? 600} ${l.tamanho}px ${FONTE}`;
      c.fillText(l.texto, W / 2, H * l.y);
    }
  });
}

type Contexto = {
  modelo: ModeloIphone;
  pecas: Map<string, THREE.Object3D[]>;
  materiais: Map<string, THREE.MeshPhysicalMaterial[]>;
  geometrias: THREE.BufferGeometry[];
  texturas: THREE.Texture[];
  tingirAro: THREE.MeshPhysicalMaterial[];
  tingirTraseira: THREE.MeshPhysicalMaterial[];
  telas: { material: THREE.MeshPhysicalMaterial; refazer: (cor: string) => THREE.Texture }[];
  botoesLado: THREE.Object3D[];
};

function novoContexto(modelo: ModeloIphone): Contexto {
  return { modelo, pecas: new Map(), materiais: new Map(), geometrias: [], texturas: [], tingirAro: [], tingirTraseira: [], telas: [], botoesLado: [] };
}

// Cria o grupo de uma peça dentro de `pai` e devolve funções para adicionar malhas e materiais a ela.
function pecaEm(ctx: Contexto, pai: THREE.Object3D, id: string) {
  const g = new THREE.Group();
  g.name = id;
  g.userData.peca = id;
  g.userData.modelo = ctx.modelo.id;
  pai.add(g);
  ctx.pecas.set(id, [...(ctx.pecas.get(id) ?? []), g]);
  const mats = ctx.materiais.get(id) ?? [];
  ctx.materiais.set(id, mats);
  const mat = (p: THREE.MeshPhysicalMaterialParameters) => {
    const m = new THREE.MeshPhysicalMaterial(p);
    m.userData.opacidade = m.opacity;
    m.userData.transparente = m.transparent;
    m.userData.emissivo = m.emissive.clone();
    m.userData.intensidade = m.emissiveIntensity;
    mats.push(m);
    return m;
  };
  const malha = (geo: THREE.BufferGeometry, material: THREE.Material, alvo: THREE.Object3D = g) => {
    ctx.geometrias.push(geo);
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    m.receiveShadow = true;
    alvo.add(m);
    return m;
  };
  const metal = (cor: string, rugosidade = 0.3) => mat({ color: cor, metalness: 1, roughness: rugosidade });
  const preto = () => mat({ color: "#121316", metalness: 0.1, roughness: 0.6 });
  const cobre = () => mat({ color: "#c27a46", metalness: 1, roughness: 0.32 });
  const lente = () => mat({ color: "#05070c", metalness: 0.3, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0 });
  return { g, mat, malha, metal, preto, cobre, lente };
}

function materialAro(ctx: Contexto, mat: ReturnType<typeof pecaEm>["mat"]) {
  const tipo = ctx.modelo.material;
  const m = mat({
    color: ctx.modelo.cores[0].aro,
    metalness: tipo === "aluminio" ? 0.85 : 1,
    roughness: tipo === "aco" ? 0.12 : tipo === "titanio" ? 0.42 : 0.32,
  });
  ctx.tingirAro.push(m);
  return m;
}

function materialTraseira(ctx: Contexto, mat: ReturnType<typeof pecaEm>["mat"], plato = false) {
  const fosco = ctx.modelo.traseira === "vidro-fosco";
  const m = mat({
    color: ctx.modelo.cores[0].traseira,
    metalness: 0.05,
    roughness: fosco && !plato ? 0.5 : 0.1,
    clearcoat: fosco && !plato ? 0.2 : 1,
    clearcoatRoughness: fosco && !plato ? 0.6 : 0.04,
  });
  ctx.tingirTraseira.push(m);
  return m;
}

// ----------------------------------------------------------------------------------------------
// iPhone convencional (todos os modelos, exceto o dobrável)
// ----------------------------------------------------------------------------------------------

function montarConvencional(ctx: Contexto, raiz: THREE.Group) {
  const m = ctx.modelo;
  const W = m.largura;
  const H = m.altura;
  const T = m.espessura;
  const R = m.raio;
  const zF = T / 2;
  const zB = -T / 2;
  const curvo = !m.bordasRetas;
  const inicio = m.frente === "botao-inicio";
  const unibody = m.traseira === "aluminio";
  const lay = layoutCameras(m);
  // Converte coordenadas da traseira (u, v) para a cena (x, y).
  const X = (u: number) => W / 2 - u;
  const Y = (v: number) => H / 2 - v;

  // Camadas internas.
  const zMag0 = zB + 0.7;
  const zChassi = zB + 1.1;
  const zInt0 = zB + 1.45;
  const zInt1 = zF - 2.2;
  const zMeio = (zInt0 + zInt1) / 2;
  const espInt = zInt1 - zInt0;

  // ---------- Tela ----------
  {
    const p = pecaEm(ctx, raiz, "tela");
    const vidro = p.mat({ color: "#0a0a0c", metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 });
    const bisel = curvo ? 0.5 : 0.35;
    p.malha(extrudar(retanguloArredondado(W - 0.6 - bisel, H - 0.6 - bisel, R - 0.3), zF - 1.2, zF, bisel), vidro);
    const borda = m.tela.tipo === "LCD" ? 4.4 : m.ano >= 2025 ? 1.9 : 2.4;
    const topo = inicio ? 17.5 : borda;
    const wT = W - borda * 2;
    const hT = H - topo * 2;
    const forma = retanguloArredondado(wT, hT, inicio ? 0.5 : R - borda);
    const geo = new THREE.ShapeGeometry(forma, 24);
    mapearUV(geo, -wT / 2, wT / 2, -hT / 2, hT / 2);
    geo.translate(0, 0, zF + 0.06);
    const refazer = (cor: string) => texturaTela(wT, hT, m.frente, cor);
    const tex = refazer(m.cores[0].traseira);
    ctx.texturas.push(tex);
    const matTela = p.mat({ map: tex, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.3, envMapIntensity: 0.25, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    ctx.telas.push({ material: matTela, refazer });
    p.malha(geo, matTela).receiveShadow = false;
    p.malha(extrudar(retanguloArredondado(W - 3, H - 3, R - 1.4), zF - 2.05, zF - 1.2), p.mat({ color: "#24262b", metalness: 0.6, roughness: 0.4 }));
    p.malha(caixa(14, 10, 0.3, -6, -H / 2 + 14, zF - 2.2, 0.1), p.cobre());
  }

  // ---------- Frente: Face ID ou botão de início ----------
  if (inicio) {
    const p = pecaEm(ctx, raiz, "inicio");
    const yB = -H / 2 + 8.8;
    p.malha(anel(5.5, 4.9, zF - 0.4, zF + 0.25, 0, yB), materialAro(ctx, p.mat));
    p.malha(cilindro(4.9, 0.4, 0, yB, zF + 0.02), p.mat({ color: "#0b0b0d", metalness: 0.2, roughness: 0.15, clearcoat: 1 }));
    p.malha(cilindro(5.2, 1.2, 0, yB, zF - 1.1), p.metal("#8d9096", 0.4));
    p.malha(caixa(5, 16, 0.25, 0, yB + 10, zF - 1.9, 0.1), p.cobre());

    const f = pecaEm(ctx, raiz, "frontal");
    const yF = H / 2 - 8.8;
    f.malha(cilindro(1.4, 0.3, -9.5, yF, zF + 0.1), f.lente());
    f.malha(caixa(11, 1.1, 0.3, 0, yF, zF + 0.1, 0.5), f.metal("#3a3b40", 0.5));
    f.malha(caixa(20, 5, 1.6, -3, yF, zF - 2, 0.5), f.metal("#3a3b40", 0.35));
  } else {
    const p = pecaEm(ctx, raiz, "truedepth");
    const ilha = m.frente.startsWith("ilha");
    const yTD = H / 2 - (ilha ? 6.2 : 4.4);
    p.malha(caixa(ilha ? 20 : 24, 5.4, Math.min(2.2, espInt), 0, yTD, zF - 1.2 - Math.min(2.2, espInt) / 2, 0.5), p.metal("#3a3b40", 0.35));
    const sensores: [number, number][] = ilha ? [[-6, 1.1], [-2.5, 0.9], [5.5, 1.4]] : [[-8.5, 1.3], [-4.2, 1], [3.3, 1.5], [8.2, 1.1]];
    for (const [x, r] of sensores) p.malha(cilindro(r, 0.4, x, yTD, zF - 1.0), p.lente());
    p.malha(caixa(10, 14, 0.25, -4, yTD - 10, zMeio, 0.1), p.cobre());

    const a = pecaEm(ctx, raiz, "auricular");
    a.malha(caixa(13, 3, 1.4, 0, H / 2 - 1.9, zF - 1.9, 0.5), a.preto());
    a.malha(caixa(11, 0.8, 0.3, 0, H / 2 - 1.9, zF - 1.1, 0.15), a.metal("#c9cbd1", 0.25));
  }

  // ---------- Placa lógica ----------
  const hPlaca = H * 0.27;
  const yPlaca1 = H / 2 - 3.5;
  const yPlaca0 = yPlaca1 - hPlaca;
  // Região das câmeras (para recortar a placa e o chassi).
  const lentesU = lay.lentes.map((l) => [l.u - l.r - 1, l.u + l.r + 1]).flat();
  const lentesV = lay.lentes.map((l) => [l.v - l.r - 1, l.v + l.r + 1]).flat();
  const cam = { x0: X(Math.max(...lentesU)), x1: X(Math.min(...lentesU)), y0: Y(Math.max(...lentesV)), y1: Y(Math.min(...lentesV)) };
  {
    const p = pecaEm(ctx, raiz, "placa");
    // Placa em L: tira o canto superior direito, onde ficam as câmeras.
    const bx0 = -W / 2 + 3;
    const bx1 = W / 2 - 3;
    const cx = Math.max(bx0 + 10, cam.x0 - 0.5);
    const cy = Math.max(yPlaca0 + 6, Math.min(yPlaca1 - 2, cam.y0 - 0.5));
    const forma = new THREE.Shape();
    forma.moveTo(bx0, yPlaca0);
    forma.lineTo(bx1, yPlaca0);
    forma.lineTo(bx1, cy);
    forma.lineTo(cx, cy);
    forma.lineTo(cx, yPlaca1);
    forma.lineTo(bx0, yPlaca1);
    forma.closePath();
    p.malha(extrudar(forma, zInt0, zInt0 + 0.9, 0.12), p.mat({ color: "#1d3b2a", metalness: 0.3, roughness: 0.5 }));
    const blind = p.metal("#c9cbd1", 0.25);
    // As câmeras ficam sempre à direita (vista de frente): os componentes vão no espaço à esquerda delas.
    const livreX = cam.x0 - 2 - (-W / 2 + 4) > 20 ? [-W / 2 + 4, cam.x0 - 2] : [-W / 2 + 4, W / 2 - 4];
    const meioL = (livreX[0] + livreX[1]) / 2;
    const larg = livreX[1] - livreX[0];
    const alt = Math.min(espInt - 1.1, 1.4);
    p.malha(caixa(larg * 0.55, hPlaca * 0.45, alt, meioL - larg * 0.2, yPlaca1 - hPlaca * 0.3, zInt0 + 0.9 + alt / 2, 0.3), blind);
    p.malha(caixa(larg * 0.4, hPlaca * 0.3, alt, meioL + larg * 0.25, yPlaca0 + hPlaca * 0.2, zInt0 + 0.9 + alt / 2, 0.3), blind);
    const texChip = texturaTexto(
      [
        { texto: m.chip.split(" (")[0].replace(" Bionic", ""), tamanho: 58, peso: 700, y: 0.52 },
        { texto: m.chip.includes("Bionic") ? "BIONIC" : "", tamanho: 24, peso: 500, y: 0.7 },
      ],
      ["#d9dadf", "#9ea1a8"],
      "#2b2c30",
    );
    ctx.texturas.push(texChip);
    const tamChip = Math.min(12, hPlaca * 0.32);
    p.malha(caixa(tamChip, tamChip, alt, meioL + larg * 0.22, yPlaca1 - hPlaca * 0.32, zInt0 + 0.9 + alt / 2, 0.4), p.mat({ map: texChip, metalness: 0.9, roughness: 0.3 }));
    const conector = p.preto();
    for (let i = 0; i < 4; i++) p.malha(caixa(3, 2, 0.7, livreX[0] + 3 + i * 4, yPlaca0 + 3, zInt0 + 1.25, 0.2), conector);
  }

  // ---------- Câmara de vapor ----------
  if (m.camaraVapor) {
    const p = pecaEm(ctx, raiz, "vapor");
    p.malha(extrudar(retanguloArredondado(W - 12, hPlaca * 0.9, 4, 0, yPlaca0 + hPlaca * 0.45 - 6), zInt1 + 0.05, zInt1 + 0.35), p.cobre());
  }

  // ---------- Bateria ----------
  {
    const p = pecaEm(ctx, raiz, "bateria");
    const y1 = yPlaca0 - 2;
    const y0 = -H / 2 + 22;
    const x0 = -W / 2 + 4.5;
    const x1 = W / 2 - 4.5;
    const corte = W * 0.28;
    const forma = new THREE.Shape();
    forma.moveTo(x0, y0);
    forma.lineTo(x1 - corte, y0);
    forma.lineTo(x1 - corte, y0 + 18);
    forma.lineTo(x1, y0 + 18);
    forma.lineTo(x1, y1);
    forma.lineTo(x0, y1);
    forma.closePath();
    const geo = extrudar(forma, zInt0, zInt1 - 0.3, Math.min(0.5, espInt / 6));
    mapearUV(geo, x0, x1, y0, y1);
    const tex = texturaTexto(
      [
        { texto: "Li-ion Battery", tamanho: 30, y: 0.42 },
        { texto: `${m.bateriaMah} mAh`, tamanho: 26, peso: 400, y: 0.5 },
        { texto: m.nome, tamanho: 20, peso: 400, y: 0.57 },
      ],
      ["#17181b", "#101113"],
      "#e8e8ea",
      512,
      512,
    );
    ctx.texturas.push(tex);
    p.malha(geo, p.mat({ map: tex, metalness: 0.2, roughness: 0.55 }));
    p.malha(caixa(8, 8, 0.4, x0 + 10, y1 + 2.5, zInt1 - 0.4, 0.15), p.cobre());
  }

  // ---------- Taptic Engine, alto-falante e porta ----------
  const yBase = -H / 2;
  {
    const p = pecaEm(ctx, raiz, "taptic");
    p.malha(caixa(W * 0.33, 8.5, espInt - 0.2, -W * 0.25, yBase + 11, zMeio, 0.8), p.metal("#c9cbd1", 0.25));
  }
  {
    const p = pecaEm(ctx, raiz, "altofalante");
    p.malha(caixa(W * 0.24, 16, espInt - 0.2, W * 0.29, yBase + 13.5, zMeio, 1.2), p.preto());
    p.malha(caixa(W * 0.17, 2.2, 0.3, W * 0.29, yBase + 5.5, zInt1 - 0.1, 0.1), p.metal("#3a3b40", 0.35));
  }
  {
    const p = pecaEm(ctx, raiz, "porta");
    const usb = m.porta === "USB-C";
    p.malha(caixa(usb ? 11 : 10, 6, Math.min(3.4, espInt), 0, yBase + 5, zMeio, 0.8), p.metal("#c9cbd1", 0.25));
    p.malha(caixa(usb ? 8.6 : 7.6, 4, usb ? 2.6 : 1.6, 0, yBase + 2.4, zMeio, usb ? 1.2 : 0.7), p.preto());
    p.malha(caixa(8, 22, 0.3, 0, yBase + 18, zInt1 + 0.1, 0.1), p.cobre());
  }

  // ---------- Estrutura (aro + chassi) ----------
  {
    const p = pecaEm(ctx, raiz, "estrutura");
    const aro = materialAro(ctx, p.mat);
    const forma = retanguloArredondado(W, H, R);
    forma.holes.push(caminhoDe(retanguloArredondado(W - 3.2, H - 3.2, R - 1.6)));
    const bisel = curvo ? Math.min(T * 0.36, 2.8) : 0.3;
    p.malha(extrudar(forma, zB + 0.5, zF - 1.1, bisel), aro);
    // Chassi interno com aberturas para as câmeras e a bobina.
    const chassi = retanguloArredondado(W - 3.4, H - 3.4, R - 1.7);
    // Abertura das câmeras, sem encostar na borda do chassi.
    const fx0 = Math.max(cam.x0 - 1, -W / 2 + 3);
    const fx1 = Math.min(cam.x1 + 1, W / 2 - 3);
    const fy0 = Math.max(cam.y0 - 1, -H / 2 + 3);
    const fy1 = Math.min(cam.y1 + 1, H / 2 - 3);
    chassi.holes.push(caminhoDe(retanguloArredondado(fx1 - fx0, fy1 - fy0, 3, (fx0 + fx1) / 2, (fy0 + fy1) / 2)));
    p.malha(extrudar(chassi, zChassi, zChassi + 0.3), p.metal("#8d9096", 0.45));
    if (unibody) {
      // Traseira de alumínio em peça única: tampa com recorte para a janela de vidro.
      const tampa = retanguloArredondado(W - 0.4, H - 0.4, R - 0.2);
      tampa.holes.push(caminhoDe(janelaVidro(W, H, R, lay)));
      p.malha(extrudar(tampa, zB, zB + 0.75, 0.3), aro);
    }
    const antena = p.mat({ color: "#77787d", metalness: 0.2, roughness: 0.6 });
    for (const [x, y] of [[W / 2, H * 0.34], [W / 2, -H * 0.33], [-W / 2, -H * 0.33], [-W / 2, H * 0.45]] as const) {
      p.malha(caixa(0.4, 1.2, T * 0.6, x, y, -0.3, 0.1), antena);
    }
    for (const x of [-W * 0.28, W * 0.31]) p.malha(caixa(1.2, 0.4, T * 0.6, x, -H / 2, -0.3, 0.1), antena);
    const furo = p.preto();
    const usb = m.porta === "USB-C";
    p.malha(caixa(usb ? 8.8 : 8, 0.5, usb ? 3 : 2, 0, -H / 2 + 0.05, zMeio, usb ? 1.2 : 0.8), furo);
    for (let i = 0; i < 6; i++) {
      for (const lado of [1, -1]) {
        const g = new THREE.CylinderGeometry(0.55, 0.55, 0.6, 16);
        g.translate(lado * (9.5 + i * 2.2), -H / 2 + 0.1, zMeio);
        p.malha(g, furo);
      }
    }
  }

  // ---------- Botões ----------
  {
    const p = pecaEm(ctx, raiz, "botoes");
    const mat = materialAro(ctx, p.mat);
    const direita = new THREE.Group();
    direita.userData.lado = 1;
    const esquerda = new THREE.Group();
    esquerda.userData.lado = -1;
    p.g.add(direita, esquerda);
    ctx.botoesLado.push(direita, esquerda);
    const zb = -0.2;
    const fundo = Math.min(2.6, T * 0.42);
    p.malha(caixa(1.4, 16, fundo, W / 2 + 0.35, H / 2 - H * 0.2, zb, 0.6), mat, direita);
    if (m.controleCamera) {
      p.malha(caixa(1, 15, fundo, W / 2 + 0.15, -H * 0.17, zb, 0.5), p.mat({ color: "#2d2f33", metalness: 0.4, roughness: 0.1, clearcoat: 1 }), direita);
      p.malha(caixa(0.8, 16, fundo + 0.4, W / 2 + 0.05, -H * 0.17, zb, 0.4), mat, direita);
    }
    const xE = -W / 2 - 0.35;
    p.malha(caixa(1.4, 9, fundo, xE, H / 2 - H * 0.17, zb, 0.6), mat, esquerda);
    p.malha(caixa(1.4, 9, fundo, xE, H / 2 - H * 0.245, zb, 0.6), mat, esquerda);
    if (m.botaoAcao) p.malha(caixa(1.4, 7, fundo, xE, H / 2 - H * 0.095, zb, 0.6), mat, esquerda);
    else {
      p.malha(caixa(1.2, 5, Math.min(1.6, T * 0.25), xE, H / 2 - H * 0.095, zb, 0.5), mat, esquerda);
      p.malha(caixa(0.6, 6.4, fundo * 0.9, -W / 2 - 0.05, H / 2 - H * 0.095, zb, 0.3), p.mat({ color: "#e0603a", metalness: 0.2, roughness: 0.5 }), esquerda);
    }
  }

  // ---------- Gaveta do chip ----------
  if (m.gavetaChip) {
    const p = pecaEm(ctx, raiz, "sim");
    const lado = m.bordasRetas ? -1 : 1;
    const yS = m.bordasRetas ? H * 0.11 : -H * 0.02;
    const xS = lado * (W / 2 - 0.1);
    p.malha(caixa(1.2, 15.6, Math.min(2.8, T * 0.4), xS, yS, -0.2, 0.4), materialAro(ctx, p.mat));
    p.malha(caixa(10, 13, 0.7, xS - lado * 5.5, yS, -0.2, 0.25), p.metal("#c9cbd1", 0.25));
    p.malha(caixa(8.8, 12.3, 0.2, xS - lado * 5.7, yS, 0.18, 0.05), p.mat({ color: "#d6b44a", metalness: 1, roughness: 0.3 }));
    p.g.userData.explosao = [lado * 30, 0, 0];
  }

  // ---------- Câmeras traseiras (módulos internos) ----------
  {
    const p = pecaEm(ctx, raiz, "cameras");
    const suporte = p.metal("#3a3b40", 0.35);
    const xs = lay.lentes.map((l) => X(l.u));
    const ys = lay.lentes.map((l) => Y(l.v));
    const rMax = Math.max(...lay.lentes.map((l) => l.r));
    p.malha(
      caixa(Math.max(...xs) - Math.min(...xs) + rMax * 2 + 2, Math.max(...ys) - Math.min(...ys) + rMax * 2 + 2, 0.8, (Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2, zInt1 - 0.6, 2),
      suporte,
    );
    for (const l of lay.lentes) {
      p.malha(cilindro(l.r * 0.95, zInt1 - zB - 1, X(l.u), Y(l.v), (zInt1 + zB) / 2 - 0.2), suporte);
      p.malha(cilindro(l.r * 0.6, 0.3, X(l.u), Y(l.v), zB + 0.2), p.lente());
      p.malha(caixa(6, 5, 0.25, X(l.u) + (X(l.u) > 0 ? -5 : 5), Y(l.v) - 6, zInt1 - 0.1, 0.1), p.cobre());
    }
  }

  // ---------- Bobina de carregamento ----------
  {
    const p = pecaEm(ctx, raiz, "magsafe");
    const yc = m.cameras === "barra-pro" ? -H * 0.08 : -H * 0.04;
    const esc = Math.min(1, W / 71.5);
    p.malha(anel(22.5 * esc, 4, zMag0 - 0.1, zMag0 + 0.2, 0, yc), p.cobre());
    if (m.magsafe) {
      p.malha(anel(27.5 * esc, 25 * esc, zMag0 - 0.15, zMag0 + 0.25, 0, yc), p.metal("#5a5c62", 0.35));
      const ima = p.metal("#a3a6ad", 0.3);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const g = caixa(6.2 * esc, 2.4, 0.45, 0, 0, 0, 0.15);
        g.rotateZ(a + Math.PI / 2);
        g.translate(Math.cos(a) * 26.25 * esc, Math.sin(a) * 26.25 * esc + yc, zMag0 + 0.05);
        p.malha(g, ima);
      }
      p.malha(caixa(4, 9, 0.45, 0, yc - 33 * esc, zMag0 + 0.05, 0.2), ima);
    }
  }

  // ---------- Traseira (vidro, platô, lentes e flash) ----------
  {
    const p = pecaEm(ctx, raiz, "traseira");
    if (unibody) {
      const vidro = p.mat({ color: m.cores[0].traseira, metalness: 0.1, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
      ctx.tingirTraseira.push(vidro);
      p.malha(extrudar(janelaVidro(W, H, R, lay, -0.2), zB, zB + 0.7, 0.2), vidro);
    } else {
      p.malha(extrudar(retanguloArredondado(W - 0.6, H - 0.6, R - 0.3), zB, zB + 0.7, curvo ? 0.35 : 0.3), materialTraseira(ctx, p.mat));
    }
    const corAnel = materialAro(ctx, p.mat);
    if (lay.plato) {
      const pl = lay.plato;
      const matPlato = unibody ? materialAro(ctx, p.mat) : materialTraseira(ctx, p.mat, true);
      const cantos: [boolean, boolean, boolean, boolean] = [true, true, true, true];
      p.malha(extrudar(retanguloArredondado(pl.w, pl.h, pl.r, X(pl.u), Y(pl.v), cantos), zB - (m.cameras === "barra-air" ? 1.6 : 1.1), zB + 0.3, 0.4), matPlato);
    }
    const zTopo = zB - (lay.plato ? (m.cameras === "barra-air" ? 1.6 : 1.1) : 0);
    for (const l of lay.lentes) {
      const salto = lay.anelSemPlato ? 1.3 : 1.0;
      p.malha(cilindro(l.r + 0.2, salto + 0.6, X(l.u), Y(l.v), zTopo - salto / 2 + 0.3), corAnel);
      p.malha(cilindro(l.r - 0.5, 0.2, X(l.u), Y(l.v), zTopo - salto - 0.05), p.lente());
      p.malha(cilindro(l.r * 0.36, 0.1, X(l.u), Y(l.v), zTopo - salto - 0.12), p.mat({ color: "#1b2340", metalness: 0.6, roughness: 0.05, clearcoat: 1 }));
    }
    const zSup = zTopo - 0.1;
    p.malha(cilindro(lay.flash.r, 0.4, X(lay.flash.u), Y(lay.flash.v), zSup), p.mat({ color: "#f3efe4", roughness: 0.3, emissive: "#fff6df", emissiveIntensity: 0.15 }));
    if (lay.lidar) p.malha(cilindro(lay.lidar.r, 0.4, X(lay.lidar.u), Y(lay.lidar.v), zSup), p.mat({ color: "#111216", metalness: 0.4, roughness: 0.1, clearcoat: 1 }));
    p.malha(cilindro(lay.mic.r, 0.4, X(lay.mic.u), Y(lay.mic.v), zSup, 12), p.preto());
  }
}

// Janela de vidro da traseira unibody (17 Pro em diante): logo abaixo do platô até perto da base.
function janelaVidro(W: number, H: number, R: number, lay: LayoutCamera, folga = 0) {
  const topo = lay.plato ? lay.plato.v + lay.plato.h / 2 + 6 : 50;
  const h = H - topo - 6 - folga * 2;
  return retanguloArredondado(W - 9 - folga * 2, h, R - 4, 0, -H / 2 + 6 + folga + h / 2);
}

// ----------------------------------------------------------------------------------------------
// iPhone dobrável: duas metades ligadas por uma dobradiça. Medidas da metade aberta.
// ----------------------------------------------------------------------------------------------

function montarDobravel(ctx: Contexto, raiz: THREE.Group) {
  const m = ctx.modelo;
  const H = m.altura;
  const Wm = m.largura - 1.8; // largura de cada metade
  const T = 5.2;
  const folga = 0.9;
  const R = m.raio;
  const zF = T / 2;
  const zB = -T / 2;
  const zPivo = zF + folga / 2;
  const lay = layoutCameras({ ...m, largura: Wm });

  // A metade direita fica parada; a esquerda gira em torno da dobradiça (x = 0) para fechar sobre a tela.
  const direita = new THREE.Group();
  const pivo = new THREE.Group();
  pivo.position.set(0, 0, zPivo);
  const esquerda = new THREE.Group();
  esquerda.position.set(0, 0, -zPivo);
  pivo.add(esquerda);
  const corpo = new THREE.Group();
  corpo.add(direita, pivo);
  raiz.add(corpo);
  raiz.userData.pivo = pivo;
  raiz.userData.corpo = corpo;
  raiz.userData.meiaLargura = Wm / 2;

  const metade = (lado: 1 | -1) => (lado === 1 ? direita : esquerda);
  // Cantos arredondados só do lado de fora; do lado da dobradiça, retos.
  const contorno = (lado: 1 | -1, enc = 0) =>
    retanguloArredondado(Wm - enc * 2, H - enc * 2, R - enc, (lado * Wm) / 2, 0, lado === 1 ? [false, true, true, false] : [true, false, false, true]);

  // Tela interna (uma imagem só, dividida entre as metades).
  const wTot = Wm * 2;
  const texInterna = (cor: string) => texturaTela(wTot - 3, H - 3, "ilha-menor", cor, true);
  const tex = texInterna(m.cores[0].traseira);
  ctx.texturas.push(tex);
  let matInterna: THREE.MeshPhysicalMaterial | null = null;
  for (const lado of [1, -1] as const) {
    const p = pecaEm(ctx, metade(lado), "tela");
    p.malha(extrudar(contorno(lado, 0.3), zF - 1, zF, 0.25), p.mat({ color: "#0a0a0c", roughness: 0.04, clearcoat: 1 }));
    const geo = new THREE.ShapeGeometry(retanguloArredondado(Wm - 1.5, H - 3, R - 1.5, lado * (Wm / 2 - 0.75), 0, lado === 1 ? [false, true, true, false] : [true, false, false, true]), 24);
    mapearUV(geo, -(wTot - 3) / 2, (wTot - 3) / 2, -(H - 3) / 2, (H - 3) / 2);
    geo.translate(0, 0, zF + 0.06);
    matInterna ??= p.mat({ map: tex, roughness: 0.05, clearcoat: 1, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.3, envMapIntensity: 0.25, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    p.malha(geo, matInterna).receiveShadow = false;
  }
  ctx.telas.push({ material: matInterna!, refazer: texInterna });

  // Tela externa na traseira da metade esquerda (vira a frente quando fechado).
  {
    const p = pecaEm(ctx, esquerda, "tela-externa");
    p.malha(extrudar(contorno(-1, 0.3), zB, zB + 0.8, 0.25), p.mat({ color: "#0a0a0c", roughness: 0.04, clearcoat: 1 }));
    const wE = Wm - 4.4;
    const hE = H - 4.4;
    const geo = new THREE.ShapeGeometry(retanguloArredondado(wE, hE, R - 2.2), 24);
    mapearUV(geo, -wE / 2, wE / 2, -hE / 2, hE / 2);
    // A tela externa é vista por trás da metade esquerda: espelha para a imagem não ficar invertida.
    geo.rotateY(Math.PI);
    geo.translate(-Wm / 2, 0, zB - 0.06);
    const refazer = (cor: string) => texturaTela(wE, hE, "dobravel", cor);
    const t = refazer(m.cores[0].traseira);
    ctx.texturas.push(t);
    const mt = p.mat({ map: t, roughness: 0.05, clearcoat: 1, emissive: "#ffffff", emissiveMap: t, emissiveIntensity: 0.3, envMapIntensity: 0.25, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    ctx.telas.push({ material: mt, refazer });
    p.malha(geo, mt).receiveShadow = false;
  }

  // Estrutura das duas metades.
  for (const lado of [1, -1] as const) {
    const p = pecaEm(ctx, metade(lado), "estrutura");
    const aro = materialAro(ctx, p.mat);
    const forma = contorno(lado);
    forma.holes.push(caminhoDe(contorno(lado, 1.4)));
    p.malha(extrudar(forma, zB + 0.5, zF - 0.9, 0.3), aro);
    p.malha(extrudar(contorno(lado, 1.5), zB + 0.9, zB + 1.15), p.metal("#8d9096", 0.45));
  }

  // Dobradiça.
  {
    const p = pecaEm(ctx, raiz, "dobradica");
    const tampa = p.mat({ color: "#9a9ca1", metalness: 1, roughness: 0.55 });
    const g = new THREE.CylinderGeometry(2.2, 2.2, H - 6, 32);
    g.translate(0, 0, -0.4);
    p.malha(g, tampa);
    for (let i = -2; i <= 2; i++) p.malha(caixa(4, 8, 1.6, 0, i * (H / 6), zF - 1.9, 0.5), p.metal("#c9cbd1", 0.25));
  }

  // Baterias (uma em cada metade).
  for (const lado of [1, -1] as const) {
    const p = pecaEm(ctx, metade(lado), "bateria");
    const x0 = lado === 1 ? 3 : -Wm + 4;
    const x1 = lado === 1 ? Wm - 4 : -3;
    const y0 = -H / 2 + (lado === 1 ? 18 : 8);
    const y1 = lado === 1 ? H / 2 - 40 : H / 2 - 8;
    const geo = extrudar(retanguloArredondado(x1 - x0, y1 - y0, 2, (x0 + x1) / 2, (y0 + y1) / 2), zB + 1.3, zF - 1.4, 0.3);
    mapearUV(geo, x0, x1, y0, y1);
    const tex = texturaTexto([{ texto: "Li-ion", tamanho: 34, y: 0.45 }, { texto: `${Math.round(m.bateriaMah / 2)} mAh`, tamanho: 26, peso: 400, y: 0.56 }], ["#17181b", "#101113"], "#e8e8ea", 512, 512);
    ctx.texturas.push(tex);
    p.malha(geo, p.mat({ map: tex, metalness: 0.2, roughness: 0.55 }));
  }

  // Placa, câmara de vapor, câmeras e traseira na metade direita.
  {
    const p = pecaEm(ctx, direita, "placa");
    p.malha(extrudar(retanguloArredondado(Wm - 8, 32, 2, Wm / 2, H / 2 - 21), zB + 1.3, zB + 2.1, 0.1), p.mat({ color: "#1d3b2a", metalness: 0.3, roughness: 0.5 }));
    const texChip = texturaTexto([{ texto: "A20 Pro", tamanho: 52, peso: 700, y: 0.56 }], ["#d9dadf", "#9ea1a8"], "#2b2c30");
    ctx.texturas.push(texChip);
    p.malha(caixa(10, 10, 1, Wm * 0.62, H / 2 - 20, zB + 2.6, 0.3), p.mat({ map: texChip, metalness: 0.9, roughness: 0.3 }));
    p.malha(caixa(16, 12, 1, Wm * 0.3, H / 2 - 24, zB + 2.6, 0.3), p.metal("#c9cbd1", 0.25));
  }
  {
    const p = pecaEm(ctx, direita, "vapor");
    p.malha(extrudar(retanguloArredondado(Wm - 12, 26, 3, Wm / 2, H / 2 - 22), zF - 1.3, zF - 1.05), p.cobre());
  }
  {
    const p = pecaEm(ctx, esquerda, "taptic");
    p.malha(caixa(20, 7, 2, -Wm / 2, -H / 2 + 5, 0, 0.6), p.metal("#c9cbd1", 0.25));
  }
  {
    const p = pecaEm(ctx, direita, "altofalante");
    p.malha(caixa(16, 8, 2, Wm * 0.72, -H / 2 + 7, 0, 0.8), p.preto());
  }
  {
    const p = pecaEm(ctx, direita, "porta");
    p.malha(caixa(11, 6, 2.6, Wm * 0.35, -H / 2 + 4.5, 0, 0.8), p.metal("#c9cbd1", 0.25));
    p.malha(caixa(8.6, 3, 2.2, Wm * 0.35, -H / 2 + 1.6, 0, 1), p.preto());
  }
  {
    const p = pecaEm(ctx, direita, "botoes");
    const mat = materialAro(ctx, p.mat);
    // Botão superior com Touch ID, volume e Controle da Câmera.
    p.malha(caixa(14, 1.2, 2.4, Wm * 0.7, H / 2 + 0.3, 0, 0.5), mat);
    p.malha(caixa(9, 1.2, 2.4, Wm * 0.42, H / 2 + 0.3, 0, 0.5), mat);
    p.malha(caixa(1, 12, 2.4, Wm + 0.2, -H * 0.15, 0, 0.4), p.mat({ color: "#2d2f33", metalness: 0.4, roughness: 0.1, clearcoat: 1 }));
    p.g.userData.explosao = [0, 14, 0];
  }
  // Na traseira, u cresce da borda de fora para a dobradiça (olhando a traseira, a metade direita fica à esquerda).
  const xU = (u: number) => Wm - u;
  {
    const p = pecaEm(ctx, direita, "cameras");
    const sup = p.metal("#3a3b40", 0.35);
    for (const l of lay.lentes) p.malha(cilindro(l.r * 0.95, T - 2.2, xU(l.u), H / 2 - l.v, -0.4), sup);
  }
  {
    const p = pecaEm(ctx, direita, "magsafe");
    p.malha(anel(18, 4, zB + 0.6, zB + 0.9, Wm / 2, -10), p.cobre());
    const ima = p.metal("#a3a6ad", 0.3);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const g = caixa(5, 2, 0.4, 0, 0, 0, 0.15);
      g.rotateZ(a + Math.PI / 2);
      g.translate(Wm / 2 + Math.cos(a) * 21, -10 + Math.sin(a) * 21, zB + 0.75);
      p.malha(g, ima);
    }
  }
  {
    const p = pecaEm(ctx, direita, "traseira");
    p.malha(extrudar(contorno(1, 0.3), zB, zB + 0.75, 0.25), materialTraseira(ctx, p.mat));
    const pl = lay.plato!;
    p.malha(extrudar(retanguloArredondado(pl.w, pl.h, pl.r, xU(pl.u), H / 2 - pl.v), zB - 1.1, zB + 0.3, 0.4), materialTraseira(ctx, p.mat, true));
    const anelM = materialAro(ctx, p.mat);
    for (const l of lay.lentes) {
      p.malha(cilindro(l.r + 0.2, 1.6, xU(l.u), H / 2 - l.v, zB - 1.4), anelM);
      p.malha(cilindro(l.r - 0.5, 0.2, xU(l.u), H / 2 - l.v, zB - 2.25), p.lente());
    }
    p.malha(cilindro(lay.flash.r, 0.4, xU(lay.flash.u), H / 2 - lay.flash.v, zB - 1.2), p.mat({ color: "#f3efe4", roughness: 0.3 }));
  }
}

// ----------------------------------------------------------------------------------------------

export function montarIphone(modelo: ModeloIphone): IphoneMontado {
  const ctx = novoContexto(modelo);
  const grupo = new THREE.Group();
  grupo.userData.modelo = modelo.id;
  const dobravel = modelo.frente === "dobravel";
  if (dobravel) montarDobravel(ctx, grupo);
  else montarConvencional(ctx, grupo);

  const pivo = grupo.userData.pivo as THREE.Group | undefined;
  let explosao = 0;

  function aplicarExplosao() {
    const t = explosao;
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    for (const [id, grupos] of ctx.pecas) {
      for (const g of grupos) {
        const [x, y, z] = (g.userData.explosao as [number, number, number] | undefined) ?? EXPLOSAO[id] ?? [0, 0, 0];
        g.position.set(x * e, y * e, z * e);
      }
    }
    for (const b of ctx.botoesLado) b.position.x = b.userData.lado * EXPLOSAO_BOTAO * e;
  }

  function definirExplosao(t: number) {
    explosao = t;
    aplicarExplosao();
  }

  function definirDobra(t: number) {
    if (!pivo) return;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    pivo.rotation.y = Math.PI * e;
    // Fechado, o aparelho fica todo sobre a metade direita: desloca para continuar centralizado.
    (grupo.userData.corpo as THREE.Group).position.x = -(grupo.userData.meiaLargura as number) * e;
  }

  function definirCor(cor: CorIphone) {
    for (const m of ctx.tingirAro) m.color.set(cor.aro);
    for (const m of ctx.tingirTraseira) m.color.set(cor.traseira);
    for (const t of ctx.telas) {
      const nova = t.refazer(cor.traseira);
      ctx.texturas.push(nova);
      t.material.map = nova;
      t.material.emissiveMap = nova;
      t.material.needsUpdate = true;
    }
  }

  function destacar(id: string | null) {
    for (const [pid, mats] of ctx.materiais) {
      const apagar = id !== null && pid !== id;
      for (const m of mats) {
        m.transparent = apagar || m.userData.transparente;
        m.opacity = apagar ? 0.1 : m.userData.opacidade;
        m.depthWrite = !apagar;
        m.needsUpdate = true;
      }
      for (const g of ctx.pecas.get(pid) ?? []) g.traverse((o) => (o.castShadow = !apagar));
    }
  }

  function realcar(id: string | null) {
    for (const [pid, mats] of ctx.materiais) {
      const ligado = pid === id;
      for (const m of mats) {
        if (ligado) {
          m.emissive.set("#2f8cff");
          m.emissiveIntensity = 0.45;
        } else {
          m.emissive.copy(m.userData.emissivo);
          m.emissiveIntensity = m.userData.intensidade;
        }
      }
    }
  }

  aplicarExplosao();

  return {
    modelo,
    grupo,
    pecas: ctx.pecas,
    largura: dobravel ? (modelo.largura - 1.8) * 2 : modelo.largura,
    definirExplosao,
    definirDobra,
    definirCor,
    destacar,
    realcar,
    descartar() {
      ctx.geometrias.forEach((g) => g.dispose());
      ctx.materiais.forEach((ms) => ms.forEach((m) => m.dispose()));
      ctx.texturas.forEach((t) => t.dispose());
    },
  };
}
