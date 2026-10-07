import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CORES_IPHONE13, type CorIphone } from "./iphone13-dados";

// Modelo 3D do iPhone 13 montado peça por peça, em milímetros (146,7 × 71,5 × 7,65 mm).
// Eixos: x = largura (direita de quem olha a tela), y = altura, z = espessura (+z = tela, −z = traseira).
// As peças são aproximações didáticas para demonstração ao cliente, não um desenho técnico da Apple.

export const LARGURA = 71.5;
export const ALTURA = 146.7;
export const ESPESSURA = 7.65;
const RAIO = 10.6;
const Z_FRENTE = ESPESSURA / 2;
const Z_TRAS = -ESPESSURA / 2;

// Quanto cada peça se afasta (em mm) na vista explodida. Peças da frente vão para +z, as de trás para −z.
const EXPLOSAO: Record<string, [number, number, number]> = {
  tela: [0, 0, 124],
  truedepth: [0, 8, 88],
  auricular: [0, 16, 98],
  bateria: [0, 0, 48],
  taptic: [-6, -12, 62],
  altofalante: [8, -12, 62],
  lightning: [0, -20, 70],
  placa: [0, 6, 24],
  estrutura: [0, 0, 0],
  botoes: [0, 0, 0],
  sim: [-30, 0, 0],
  cameras: [0, 4, -34],
  magsafe: [0, 0, -58],
  traseira: [0, 0, -88],
};
// Os botões se afastam para os lados (cada um para o seu), tratado à parte.
const EXPLOSAO_BOTAO = 16;

export type ModeloIphone = {
  grupo: THREE.Group;
  pecas: Map<string, THREE.Object3D>;
  definirExplosao: (t: number) => void;
  definirCor: (cor: CorIphone) => void;
  destacar: (id: string | null) => void;
  descartar: () => void;
};

function retanguloArredondado(w: number, h: number, r: number, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  const x = cx - w / 2;
  const y = cy - h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function caminhoArredondado(w: number, h: number, r: number, cx = 0, cy = 0) {
  const s = retanguloArredondado(w, h, r, cx, cy);
  const p = new THREE.Path();
  p.setFromPoints(s.getPoints(12).reverse());
  return p;
}

// Extrusão de uma forma entre z0 e z1, com bisel opcional nas bordas.
function extrudar(forma: THREE.Shape, z0: number, z1: number, bisel = 0) {
  const prof = Math.max(z1 - z0 - bisel * 2, 0.01);
  const g = new THREE.ExtrudeGeometry(forma, {
    depth: prof,
    bevelEnabled: bisel > 0,
    bevelThickness: bisel,
    bevelSize: bisel,
    bevelSegments: 3,
    curveSegments: 16,
  });
  g.translate(0, 0, z0 + bisel);
  return g;
}

function caixa(w: number, h: number, d: number, x: number, y: number, z: number, raio = 0.4) {
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(raio, w / 2, h / 2, d / 2));
  g.translate(x, y, z);
  return g;
}

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

function textura(largura: number, altura: number, desenhar: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const c = canvas.getContext("2d")!;
  desenhar(c);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Tela de bloqueio: papel de parede, hora e o entalhe (notch) do TrueDepth.
function texturaTela(w: number, h: number) {
  const px = 9;
  return textura(Math.round(w * px), Math.round(h * px), (c) => {
    const W = c.canvas.width;
    const H = c.canvas.height;
    const fundo = c.createLinearGradient(0, 0, W * 0.4, H);
    fundo.addColorStop(0, "#0b1e3f");
    fundo.addColorStop(0.45, "#3b2a7a");
    fundo.addColorStop(0.75, "#8a2f6a");
    fundo.addColorStop(1, "#c4584f");
    c.fillStyle = fundo;
    c.fillRect(0, 0, W, H);
    // Ondas suaves no papel de parede.
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(0, H * (0.55 + i * 0.08));
      c.bezierCurveTo(W * 0.3, H * (0.45 + i * 0.07), W * 0.7, H * (0.7 + i * 0.05), W, H * (0.5 + i * 0.09));
      c.lineTo(W, H);
      c.lineTo(0, H);
      c.closePath();
      c.fillStyle = `rgba(255,255,255,${0.03 + i * 0.01})`;
      c.fill();
    }
    c.fillStyle = "rgba(255,255,255,0.95)";
    c.textAlign = "center";
    c.font = `600 ${W * 0.05}px -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
    c.fillText("terça-feira, 14 de setembro", W / 2, H * 0.16);
    c.font = `300 ${W * 0.26}px -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
    c.fillText("9:41", W / 2, H * 0.3);
    // Barra de início.
    c.fillStyle = "rgba(255,255,255,0.9)";
    const bw = W * 0.36;
    c.beginPath();
    c.roundRect((W - bw) / 2, H * 0.975, bw, H * 0.006, H * 0.003);
    c.fill();
    // Atalhos de lanterna e câmera.
    for (const x of [W * 0.16, W * 0.84]) {
      c.beginPath();
      c.arc(x, H * 0.91, W * 0.065, 0, Math.PI * 2);
      c.fillStyle = "rgba(20,20,30,0.45)";
      c.fill();
    }
    // Entalhe.
    const nw = W * 0.41;
    const nh = H * 0.036;
    c.fillStyle = "#000";
    c.beginPath();
    c.roundRect((W - nw) / 2, -nh, nw, nh * 2, nh * 0.9);
    c.fill();
    c.beginPath();
    c.arc(W / 2 + nw * 0.24, nh * 0.5, nh * 0.22, 0, Math.PI * 2);
    c.fillStyle = "#101826";
    c.fill();
  });
}

function texturaChip() {
  return textura(256, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, "#d9dadf");
    g.addColorStop(1, "#9ea1a8");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = "#2b2c30";
    c.textAlign = "center";
    c.font = "700 64px -apple-system, Helvetica, Arial, sans-serif";
    c.fillText("A15", 128, 128);
    c.font = "500 26px -apple-system, Helvetica, Arial, sans-serif";
    c.fillText("BIONIC", 128, 168);
  });
}

function texturaBateria() {
  return textura(512, 512, (c) => {
    c.fillStyle = "#16171a";
    c.fillRect(0, 0, 512, 512);
    c.fillStyle = "#e8e8ea";
    c.textAlign = "left";
    c.font = "600 30px -apple-system, Helvetica, Arial, sans-serif";
    c.fillText("Li-ion Battery", 60, 210);
    c.font = "400 22px -apple-system, Helvetica, Arial, sans-serif";
    c.fillText("3.88V  12.41Wh  3227mAh", 60, 250);
    c.fillText("Mod. A2653", 60, 285);
    c.strokeStyle = "#e8e8ea";
    c.lineWidth = 2;
    c.strokeRect(60, 310, 70, 34);
    c.strokeRect(150, 310, 70, 34);
  });
}

export function criarIphone13(): ModeloIphone {
  const grupo = new THREE.Group();
  const pecas = new Map<string, THREE.Object3D>();
  const geometrias: THREE.BufferGeometry[] = [];
  const materiais: THREE.Material[] = [];
  const texturas: THREE.Texture[] = [];

  function mat(p: THREE.MeshPhysicalMaterialParameters) {
    const m = new THREE.MeshPhysicalMaterial(p);
    m.userData.opacidade = m.opacity;
    m.userData.transparente = m.transparent;
    materiais.push(m);
    return m;
  }

  function peca(id: string) {
    const g = new THREE.Group();
    g.name = id;
    g.userData.peca = id;
    grupo.add(g);
    pecas.set(id, g);
    return g;
  }

  function malha(alvo: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material) {
    geometrias.push(geo);
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    m.receiveShadow = true;
    alvo.add(m);
    return m;
  }

  const metalEscuro = () => mat({ color: "#3a3b40", metalness: 0.85, roughness: 0.35 });
  const metalClaro = () => mat({ color: "#c9cbd1", metalness: 1, roughness: 0.25 });
  const plasticoPreto = () => mat({ color: "#121316", metalness: 0.1, roughness: 0.6 });
  const cobre = () => mat({ color: "#c27a46", metalness: 1, roughness: 0.32 });
  const vidroLente = () => mat({ color: "#05070c", metalness: 0.3, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0 });

  // ---------- Tela ----------
  const tela = peca("tela");
  const vidroFrente = mat({ color: "#0a0a0c", metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 });
  malha(tela, extrudar(retanguloArredondado(LARGURA - 0.6, ALTURA - 0.6, RAIO - 0.3), Z_FRENTE - 1.25, Z_FRENTE, 0.35), vidroFrente);
  const wTela = LARGURA - 4.6;
  const hTela = ALTURA - 4.6;
  const formaTela = retanguloArredondado(wTela, hTela, RAIO - 2.2);
  const geoTela = new THREE.ShapeGeometry(formaTela, 24);
  const uv = geoTela.attributes.uv as THREE.BufferAttribute;
  const pos = geoTela.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / wTela + 0.5, pos.getY(i) / hTela + 0.5);
  geoTela.translate(0, 0, Z_FRENTE + 0.012);
  const texTela = texturaTela(wTela, hTela);
  texturas.push(texTela);
  const matTela = mat({ map: texTela, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, emissive: "#ffffff", emissiveMap: texTela, emissiveIntensity: 0.3 });
  malha(tela, geoTela, matTela);
  // Painel OLED por baixo do vidro (aparece na vista explodida).
  malha(tela, extrudar(retanguloArredondado(LARGURA - 3, ALTURA - 3, RAIO - 1.4), Z_FRENTE - 2.1, Z_FRENTE - 1.25), mat({ color: "#24262b", metalness: 0.6, roughness: 0.4 }));
  malha(tela, caixa(14, 10, 0.3, -6, -60, Z_FRENTE - 2.25, 0.1), cobre());

  // ---------- TrueDepth e auricular ----------
  const truedepth = peca("truedepth");
  const suporteTD = metalEscuro();
  malha(truedepth, caixa(24, 5.6, 2.2, 0, 67.6, 1.1, 0.5), suporteTD);
  for (const [x, r] of [[-8.5, 1.3], [-4.2, 1], [3.3, 1.5], [8.2, 1.1]] as const) {
    malha(truedepth, cilindro(r, 0.6, x, 67.6, 2.35), vidroLente());
  }
  malha(truedepth, caixa(10, 14, 0.25, -4, 58, 0.15, 0.1), cobre());

  const auricular = peca("auricular");
  malha(auricular, caixa(13, 3.2, 1.6, 0, 70.8, 1.2, 0.5), plasticoPreto());
  malha(auricular, caixa(11, 1, 0.3, 0, 70.8, 2.1, 0.15), metalClaro());

  // ---------- Bateria (formato de L) ----------
  const bateria = peca("bateria");
  const formaBat = new THREE.Shape();
  formaBat.moveTo(-30, -52);
  formaBat.lineTo(10, -52);
  formaBat.lineTo(10, -30);
  formaBat.lineTo(30, -30);
  formaBat.lineTo(30, 24);
  formaBat.lineTo(-30, 24);
  formaBat.closePath();
  const geoBat = extrudar(formaBat, -2.9, 1.5, 0.5);
  const texBat = texturaBateria();
  texBat.wrapS = texBat.wrapT = THREE.ClampToEdgeWrapping;
  texturas.push(texBat);
  // Ajusta as coordenadas de textura da tampa da bateria para o retângulo da peça.
  const uvBat = geoBat.attributes.uv as THREE.BufferAttribute;
  const posBat = geoBat.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uvBat.count; i++) uvBat.setXY(i, (posBat.getX(i) + 30) / 60, (posBat.getY(i) + 52) / 76);
  malha(bateria, geoBat, mat({ map: texBat, metalness: 0.2, roughness: 0.55 }));
  malha(bateria, caixa(8, 10, 0.4, -20, 28, 1.2, 0.15), cobre());

  // ---------- Taptic Engine, alto-falante e Lightning ----------
  const taptic = peca("taptic");
  malha(taptic, caixa(24, 9, 3.4, -18, -63, -0.6, 0.8), metalClaro());
  malha(taptic, caixa(6, 3, 0.3, -4, -63, 1.2, 0.1), cobre());

  const altofalante = peca("altofalante");
  malha(altofalante, caixa(16, 17, 3.6, 21, -58, -0.6, 1.2), plasticoPreto());
  malha(altofalante, caixa(12, 2.4, 0.3, 21, -66, 1.25, 0.1), metalEscuro());

  const lightning = peca("lightning");
  malha(lightning, caixa(10, 6, 3.2, 0, -69, -0.4, 0.8), metalClaro());
  malha(lightning, caixa(7.6, 4, 1.6, 0, -71.5, -0.4, 0.7), plasticoPreto());
  malha(lightning, caixa(8, 30, 0.3, 0, -52, 1.5, 0.1), cobre());

  // ---------- Placa lógica ----------
  const placa = peca("placa");
  const formaPlaca = new THREE.Shape();
  formaPlaca.moveTo(-31, 28);
  formaPlaca.lineTo(31, 28);
  formaPlaca.lineTo(31, 42);
  formaPlaca.lineTo(8, 42);
  formaPlaca.lineTo(8, 66);
  formaPlaca.lineTo(-31, 66);
  formaPlaca.closePath();
  malha(placa, extrudar(formaPlaca, -2.4, -1.2, 0.15), mat({ color: "#1d3b2a", metalness: 0.3, roughness: 0.5 }));
  const blindagem = metalClaro();
  malha(placa, caixa(20, 18, 1.4, -18, 52, -0.45, 0.3), blindagem);
  malha(placa, caixa(14, 10, 1.2, 20, 35, -0.55, 0.3), blindagem);
  malha(placa, caixa(10, 8, 1, -24, 34, -0.6, 0.3), blindagem);
  const texChip = texturaChip();
  texturas.push(texChip);
  malha(placa, caixa(12, 12, 1.2, -1, 51, -0.5, 0.4), mat({ map: texChip, metalness: 0.9, roughness: 0.3 }));
  for (let i = 0; i < 4; i++) malha(placa, caixa(3, 2, 0.8, -26 + i * 4, 62, -0.8, 0.2), plasticoPreto());

  // ---------- Estrutura de alumínio ----------
  const estrutura = peca("estrutura");
  const formaAro = retanguloArredondado(LARGURA, ALTURA, RAIO);
  formaAro.holes.push(caminhoArredondado(LARGURA - 3.2, ALTURA - 3.2, RAIO - 1.6));
  const matAro = mat({ color: CORES_IPHONE13[0].aro, metalness: 0.9, roughness: 0.32 });
  malha(estrutura, extrudar(formaAro, Z_TRAS + 0.5, Z_FRENTE - 1.2, 0.3), matAro);
  // Placa interna (chassi) onde as peças se apoiam.
  const formaChassi = retanguloArredondado(LARGURA - 3.4, ALTURA - 3.4, RAIO - 1.7);
  formaChassi.holes.push(caminhoArredondado(25, 25, 6, 20, 57.8));
  formaChassi.holes.push(caminhoArredondado(46, 46, 23, 0, -5));
  malha(estrutura, extrudar(formaChassi, -3.15, -2.85), mat({ color: "#8d9096", metalness: 0.8, roughness: 0.45 }));
  // Faixas de antena nas laterais.
  const antena = mat({ color: "#6f7076", metalness: 0.2, roughness: 0.6 });
  for (const [x, y] of [[LARGURA / 2, 50], [LARGURA / 2, -48], [-LARGURA / 2, -48], [-LARGURA / 2, 66]] as const) {
    malha(estrutura, caixa(0.4, 1.2, 4.6, x, y, 0, 0.1), antena);
  }
  for (const [x, y] of [[-20, -ALTURA / 2], [22, -ALTURA / 2]] as const) {
    malha(estrutura, caixa(1.2, 0.4, 4.6, x, y, 0, 0.1), antena);
  }
  // Furos do alto-falante, microfone e porta Lightning na base.
  const furo = plasticoPreto();
  malha(estrutura, caixa(8, 0.5, 3, 0, -ALTURA / 2 + 0.05, -0.3, 0.2), furo);
  for (let i = 0; i < 6; i++) {
    malha(estrutura, cilindro(0.55, 0.6, 0, 0, 0, 16).rotateX(Math.PI / 2).translate(9 + i * 2.2, -ALTURA / 2 + 0.1, -0.3), furo);
    malha(estrutura, cilindro(0.55, 0.6, 0, 0, 0, 16).rotateX(Math.PI / 2).translate(-9 - i * 2.2, -ALTURA / 2 + 0.1, -0.3), furo);
  }

  // ---------- Botões ----------
  const botoes = peca("botoes");
  const matBotao = mat({ color: CORES_IPHONE13[0].aro, metalness: 0.9, roughness: 0.3 });
  const botaoDireito = new THREE.Group();
  botaoDireito.userData.lado = 1;
  botoes.add(botaoDireito);
  malha(botaoDireito, caixa(1.4, 16, 2.6, LARGURA / 2 + 0.4, 45, -0.2, 0.6), matBotao);
  const botoesEsquerdos = new THREE.Group();
  botoesEsquerdos.userData.lado = -1;
  botoes.add(botoesEsquerdos);
  malha(botoesEsquerdos, caixa(1.4, 9, 2.6, -LARGURA / 2 - 0.4, 38, -0.2, 0.6), matBotao);
  malha(botoesEsquerdos, caixa(1.4, 9, 2.6, -LARGURA / 2 - 0.4, 49, -0.2, 0.6), matBotao);
  malha(botoesEsquerdos, caixa(1.2, 5, 1.6, -LARGURA / 2 - 0.35, 60, -0.2, 0.5), matBotao);
  malha(botoesEsquerdos, caixa(0.6, 6.4, 2.4, -LARGURA / 2 - 0.05, 60, -0.2, 0.3), mat({ color: "#e0603a", metalness: 0.2, roughness: 0.5 }));

  // ---------- Gaveta do chip ----------
  const sim = peca("sim");
  malha(sim, caixa(1.2, 15.6, 2.8, -LARGURA / 2 + 0.1, 16, -0.2, 0.4), mat({ color: CORES_IPHONE13[0].aro, metalness: 0.9, roughness: 0.3 }));
  malha(sim, caixa(10, 13, 0.7, -LARGURA / 2 + 5.6, 16, -0.2, 0.25), metalClaro());
  malha(sim, caixa(8.8, 12.3, 0.2, -LARGURA / 2 + 5.8, 16, 0.18, 0.05), mat({ color: "#d6b44a", metalness: 1, roughness: 0.3 }));

  // ---------- Câmeras traseiras ----------
  const cameras = peca("cameras");
  const lentes: [number, number, number][] = [
    [25.4, 63.3, 6.2], // grande-angular
    [14.6, 52.4, 5.4], // ultra-angular
  ];
  malha(cameras, caixa(25, 25, 0.8, 20, 57.8, -2.4, 3), metalEscuro());
  for (const [x, y, r] of lentes) {
    malha(cameras, cilindro(r, 4.4, x, y, -0.5), metalEscuro());
    malha(cameras, cilindro(r * 0.62, 0.3, x, y, -2.85), vidroLente());
    malha(cameras, caixa(6, 5, 0.25, x - 5, y - 6, 1.85, 0.1), cobre());
  }

  // ---------- MagSafe ----------
  const magsafe = peca("magsafe");
  malha(magsafe, anel(22.5, 4, -3.55, -3.3), cobre());
  malha(magsafe, anel(27.5, 25, -3.6, -3.25), mat({ color: "#5a5c62", metalness: 0.9, roughness: 0.35 }));
  const matIma = mat({ color: "#a3a6ad", metalness: 1, roughness: 0.3 });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const g = caixa(6.2, 2.4, 0.5, 0, 0, 0, 0.15);
    g.rotateZ(a + Math.PI / 2);
    g.translate(Math.cos(a) * 26.25, Math.sin(a) * 26.25 - 5, -3.45);
    malha(magsafe, g, matIma);
  }
  // Ímã de alinhamento abaixo do anel.
  malha(magsafe, caixa(4, 9, 0.5, 0, -38, -3.45, 0.2), matIma);
  magsafe.children.slice(0, 2).forEach((m) => (m as THREE.Mesh).geometry.translate(0, -5, 0));

  // ---------- Vidro traseiro com o módulo das câmeras ----------
  const traseira = peca("traseira");
  const matTraseira = mat({ color: CORES_IPHONE13[0].traseira, metalness: 0.05, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
  malha(traseira, extrudar(retanguloArredondado(LARGURA - 0.6, ALTURA - 0.6, RAIO - 0.3), Z_TRAS, Z_TRAS + 0.75, 0.3), matTraseira);
  // Platô das câmeras (ilha de vidro elevada).
  const matPlato = mat({ color: CORES_IPHONE13[0].traseira, metalness: 0.05, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02 });
  malha(traseira, extrudar(retanguloArredondado(25.4, 25.4, 6.4, 20, 57.8), Z_TRAS - 0.6, Z_TRAS + 0.2, 0.3), matPlato);
  const matAnelLente = mat({ color: CORES_IPHONE13[0].aro, metalness: 0.95, roughness: 0.22 });
  for (const [x, y, r] of lentes) {
    malha(traseira, cilindro(r + 0.15, 1.7, x, y, Z_TRAS - 1.05), matAnelLente);
    malha(traseira, cilindro(r - 0.5, 0.2, x, y, Z_TRAS - 1.92), vidroLente());
    malha(traseira, cilindro(r * 0.38, 0.1, x, y, Z_TRAS - 2.0), mat({ color: "#1b2340", metalness: 0.6, roughness: 0.05, clearcoat: 1 }));
  }
  // Flash True Tone e microfone.
  malha(traseira, cilindro(1.9, 0.4, 14.6, 63.3, Z_TRAS - 0.75), mat({ color: "#f3efe4", metalness: 0, roughness: 0.3, emissive: "#fff6df", emissiveIntensity: 0.15 }));
  malha(traseira, cilindro(0.45, 0.4, 25.4, 52.4, Z_TRAS - 0.75, 12), plasticoPreto());

  // Guarda a posição montada de cada parte para a animação da vista explodida.
  for (const g of pecas.values()) g.userData.base = g.position.clone();

  const materiaisAro = [matAro, matBotao, matAnelLente, (sim.children[0] as THREE.Mesh).material as THREE.MeshPhysicalMaterial];

  function definirExplosao(t: number) {
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    for (const [id, g] of pecas) {
      const [x, y, z] = EXPLOSAO[id] ?? [0, 0, 0];
      g.position.set(x * e, y * e, z * e);
    }
    botaoDireito.position.x = EXPLOSAO_BOTAO * e;
    botoesEsquerdos.position.x = -EXPLOSAO_BOTAO * e;
  }

  function definirCor(cor: CorIphone) {
    matTraseira.color.set(cor.traseira);
    matPlato.color.set(cor.traseira);
    for (const m of materiaisAro) m.color.set(cor.aro);
  }

  function destacar(id: string | null) {
    for (const [pid, g] of pecas) {
      const apagar = id !== null && pid !== id;
      g.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined;
        if (!m) return;
        o.castShadow = !apagar;
        m.transparent = apagar || m.userData.transparente;
        m.opacity = apagar ? 0.12 : m.userData.opacidade;
        m.depthWrite = !apagar;
        m.needsUpdate = true;
      });
    }
  }

  return {
    grupo,
    pecas,
    definirExplosao,
    definirCor,
    destacar,
    descartar() {
      geometrias.forEach((g) => g.dispose());
      materiais.forEach((m) => m.dispose());
      texturas.forEach((t) => t.dispose());
    },
  };
}
