import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { montarIphone, type IphoneMontado } from "./construtor";
import type { CorIphone, ModeloIphone } from "./modelos";

// Cena 3D da Vitrine: mostra um ou mais iPhones lado a lado, em escala real, com rotação,
// vista explodida, destaque de peças e identificação da peça sob o mouse.

export type Vista = "frente" | "tras" | "lateral" | "tres-quartos" | "explodida";
export type PecaSob = { peca: string; modelo: string; x: number; y: number };

export type Palco = {
  definirAparelhos: (lista: { modelo: ModeloIphone; cor: CorIphone }[]) => void;
  definirCor: (indice: number, cor: CorIphone) => void;
  definirExplosao: (t: number) => void;
  definirDobra: (t: number) => void;
  destacar: (id: string | null) => void;
  girar: (ligado: boolean) => void;
  irPara: (v: Vista) => void;
  descartar: () => void;
};

const DIRECOES: Record<Vista, [number, number, number]> = {
  "tres-quartos": [0.55, 0.22, 0.8],
  frente: [0, 0, 1],
  tras: [0, 0, -1],
  lateral: [1, 0.05, 0.02],
  explodida: [0.92, 0.32, 0.5],
};
// Com vários aparelhos lado a lado, a vista explodida é de cima, para as camadas não se sobreporem.
const EXPLODIDA_VARIOS: [number, number, number] = [0.18, 0.78, 0.6];
const ESPACO = 30;

export function criarPalco(
  el: HTMLElement,
  eventos: { aoPassar: (p: PecaSob | null) => void; aoClicar: (p: PecaSob | null) => void },
): Palco {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(el.clientWidth, el.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.touchAction = "none";
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const ambiente = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = ambiente;

  const camera = new THREE.PerspectiveCamera(30, el.clientWidth / Math.max(el.clientHeight, 1), 10, 6000);
  const controles = new OrbitControls(camera, renderer.domElement);
  controles.enableDamping = true;
  controles.dampingFactor = 0.08;
  controles.minDistance = 80;
  controles.maxDistance = 2400;
  controles.autoRotate = true;
  controles.autoRotateSpeed = 1.2;
  controles.enablePan = false;

  const luz = new THREE.DirectionalLight("#ffffff", 1.6);
  luz.position.set(160, 260, 300);
  luz.castShadow = true;
  luz.shadow.mapSize.set(2048, 2048);
  Object.assign(luz.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300, far: 1400 });
  luz.shadow.bias = -0.0005;
  luz.shadow.normalBias = 0.6;
  scene.add(luz);
  scene.add(new THREE.HemisphereLight("#ffffff", "#8a8f99", 0.5));

  const chao = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.ShadowMaterial({ opacity: 0.16 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  scene.add(chao);

  let aparelhos: IphoneMontado[] = [];
  let rotulos: THREE.Sprite[] = [];
  let explosaoAlvo = 0;
  let explosao = 0;
  let dobraAlvo = 0;
  let dobra = 0;
  let destaque: string | null = null;
  let realcado: { indice: number; peca: string } | null = null;
  let distanciaAtual = 0;
  let animCamera: { de: THREE.Vector3; para: THREE.Vector3; t: number } | null = null;

  function larguraTotal() {
    return aparelhos.reduce((s, a) => s + a.largura, 0) + ESPACO * Math.max(aparelhos.length - 1, 0);
  }
  function alturaMaior() {
    return Math.max(150, ...aparelhos.map((a) => a.modelo.altura));
  }

  // Distância da câmera para tudo caber na tela, considerando a separação das peças.
  function distanciaIdeal() {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const aspecto = camera.aspect || 1;
    const h = alturaMaior() * (aparelhos.length > 1 ? 1.4 : 1.6);
    const w = Math.max(larguraTotal(), 80) * (aparelhos.length > 1 ? 1.2 : 1.8);
    const base = Math.max(h / (2 * tan), w / (2 * tan * aspecto));
    return base * (1 + explosao * (aparelhos.length > 1 ? 0.55 : 0.7));
  }

  function ajustarDistancia() {
    const nova = distanciaIdeal();
    if (distanciaAtual > 0) {
      const fator = nova / distanciaAtual;
      camera.position.multiplyScalar(fator);
      if (animCamera) {
        animCamera.de.multiplyScalar(fator);
        animCamera.para.multiplyScalar(fator);
      }
    }
    distanciaAtual = nova;
  }

  function direcao(v: Vista) {
    const d = v === "explodida" && aparelhos.length > 1 ? EXPLODIDA_VARIOS : DIRECOES[v];
    return new THREE.Vector3(...d).normalize();
  }

  function irPara(v: Vista) {
    animCamera = { de: camera.position.clone(), para: direcao(v).multiplyScalar(distanciaIdeal()), t: 0 };
  }

  function rotulo(texto: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const c = canvas.getContext("2d")!;
    c.font = `600 64px -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = getComputedStyle(el).color || "#1d1d1f";
    c.fillText(texto, 512, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(80, 10, 1);
    return s;
  }

  function limpar() {
    for (const a of aparelhos) {
      scene.remove(a.grupo);
      a.descartar();
    }
    for (const r of rotulos) {
      scene.remove(r);
      r.material.map?.dispose();
      r.material.dispose();
    }
    aparelhos = [];
    rotulos = [];
    realcado = null;
  }

  function definirAparelhos(lista: { modelo: ModeloIphone; cor: CorIphone }[]) {
    const primeiraVez = aparelhos.length === 0;
    limpar();
    aparelhos = lista.map(({ modelo, cor }) => {
      const a = montarIphone(modelo);
      a.definirCor(cor);
      a.definirExplosao(explosao);
      a.definirDobra(dobra);
      a.destacar(destaque);
      return a;
    });
    // Lado a lado, alinhados pela base, em escala real entre si.
    const total = larguraTotal();
    const base = -alturaMaior() / 2;
    let x = -total / 2;
    aparelhos.forEach((a) => {
      a.grupo.position.set(x + a.largura / 2, base + a.modelo.altura / 2, 0);
      x += a.largura + ESPACO;
      scene.add(a.grupo);
      if (lista.length > 1) {
        const r = rotulo(a.modelo.nome);
        r.position.set(a.grupo.position.x, base - 12, 0);
        scene.add(r);
        rotulos.push(r);
      }
    });
    chao.position.y = base - 24;
    if (primeiraVez || distanciaAtual === 0) {
      distanciaAtual = distanciaIdeal();
      camera.position.copy(direcao("tres-quartos").multiplyScalar(distanciaAtual));
    } else {
      ajustarDistancia();
    }
  }

  // ---------- Mouse e toque ----------
  const raycaster = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  function pecaEm(ev: PointerEvent): PecaSob | null {
    const r = renderer.domElement.getBoundingClientRect();
    ponteiro.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ponteiro, camera);
    for (const hit of raycaster.intersectObjects(aparelhos.map((a) => a.grupo), true)) {
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.peca) o = o.parent;
      const peca = o?.userData.peca as string | undefined;
      // Com uma peça em destaque, as outras ficam transparentes e não bloqueiam o mouse.
      if (peca && (!destaque || peca === destaque)) return { peca, modelo: o!.userData.modelo, x: ev.clientX - r.left, y: ev.clientY - r.top };
    }
    return null;
  }

  function realcar(p: PecaSob | null) {
    const indice = p ? aparelhos.findIndex((a) => a.modelo.id === p.modelo) : -1;
    if (realcado && (!p || realcado.indice !== indice || realcado.peca !== p.peca)) aparelhos[realcado.indice]?.realcar(null);
    if (p && indice >= 0) {
      aparelhos[indice].realcar(p.peca);
      realcado = { indice, peca: p.peca };
    } else realcado = null;
  }

  let inicioClique: { x: number; y: number } | null = null;
  const aoPressionar = (ev: PointerEvent) => (inicioClique = { x: ev.clientX, y: ev.clientY });
  const aoSoltar = (ev: PointerEvent) => {
    if (!inicioClique || Math.hypot(ev.clientX - inicioClique.x, ev.clientY - inicioClique.y) > 6) return;
    const p = pecaEm(ev);
    // No toque não existe "passar o mouse": o toque mostra o nome da peça também.
    if (ev.pointerType !== "mouse") {
      realcar(p);
      eventos.aoPassar(p);
    }
    eventos.aoClicar(p);
  };
  const aoMover = (ev: PointerEvent) => {
    if (ev.pointerType !== "mouse" || ev.buttons) return;
    const p = pecaEm(ev);
    realcar(p);
    renderer.domElement.style.cursor = p ? "pointer" : "grab";
    eventos.aoPassar(p);
  };
  const aoSair = () => {
    realcar(null);
    eventos.aoPassar(null);
  };
  // A rodinha do mouse rola a página; o zoom fica no gesto de pinça (trackpad ou toque) e no Ctrl/Cmd + rodinha.
  const aoRolar = (ev: WheelEvent) => {
    if (!ev.ctrlKey && !ev.metaKey) ev.stopImmediatePropagation();
  };
  renderer.domElement.addEventListener("wheel", aoRolar, { capture: true });
  renderer.domElement.addEventListener("pointerdown", aoPressionar);
  renderer.domElement.addEventListener("pointerup", aoSoltar);
  renderer.domElement.addEventListener("pointermove", aoMover);
  renderer.domElement.addEventListener("pointerleave", aoSair);

  const redimensionar = () => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    ajustarDistancia();
  };
  const observador = new ResizeObserver(redimensionar);
  observador.observe(el);

  // ---------- Animação ----------
  let quadro = 0;
  let ultimo = performance.now();
  const loop = (agora: number) => {
    quadro = requestAnimationFrame(loop);
    const dt = Math.min((agora - ultimo) / 1000, 0.1);
    ultimo = agora;
    if (Math.abs(explosaoAlvo - explosao) > 0.0005) {
      explosao += (explosaoAlvo - explosao) * Math.min(dt * 6, 1);
      if (Math.abs(explosaoAlvo - explosao) <= 0.0005) explosao = explosaoAlvo;
      aparelhos.forEach((a) => a.definirExplosao(explosao));
      ajustarDistancia();
    }
    if (Math.abs(dobraAlvo - dobra) > 0.0005) {
      dobra += (dobraAlvo - dobra) * Math.min(dt * 4, 1);
      if (Math.abs(dobraAlvo - dobra) <= 0.0005) dobra = dobraAlvo;
      aparelhos.forEach((a) => a.definirDobra(dobra));
    }
    if (animCamera) {
      animCamera.t = Math.min(animCamera.t + dt * 1.6, 1);
      const e = 1 - Math.pow(1 - animCamera.t, 3);
      camera.position.lerpVectors(animCamera.de, animCamera.para, e);
      if (animCamera.t >= 1) animCamera = null;
    }
    controles.update(dt);
    renderer.render(scene, camera);
  };
  quadro = requestAnimationFrame(loop);

  return {
    definirAparelhos,
    definirCor(indice, cor) {
      aparelhos[indice]?.definirCor(cor);
    },
    definirExplosao(t) {
      explosaoAlvo = t;
    },
    definirDobra(t) {
      dobraAlvo = t;
    },
    destacar(id) {
      destaque = id;
      aparelhos.forEach((a) => a.destacar(id));
    },
    girar(ligado) {
      controles.autoRotate = ligado;
    },
    irPara,
    descartar() {
      cancelAnimationFrame(quadro);
      observador.disconnect();
      renderer.domElement.removeEventListener("wheel", aoRolar, { capture: true });
      renderer.domElement.removeEventListener("pointerdown", aoPressionar);
      renderer.domElement.removeEventListener("pointerup", aoSoltar);
      renderer.domElement.removeEventListener("pointermove", aoMover);
      renderer.domElement.removeEventListener("pointerleave", aoSair);
      limpar();
      controles.dispose();
      chao.geometry.dispose();
      chao.material.dispose();
      ambiente.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
