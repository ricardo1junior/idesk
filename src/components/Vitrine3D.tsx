"use client";

import { useEffect, useRef, useState } from "react";
import type { Object3D, Vector3 } from "three";
import type { CorIphone, InfoPeca } from "@/lib/vitrine/iphone13-dados";
import type { ModeloIphone } from "@/lib/vitrine/iphone13";

type Vista = "frente" | "tras" | "lateral" | "tres-quartos" | "explodida";

type Cena = {
  modelo: ModeloIphone;
  irPara: (v: Vista) => void;
  girar: (ligado: boolean) => void;
};

const VISTAS: { id: Vista; nome: string }[] = [
  { id: "tres-quartos", nome: "Perspectiva" },
  { id: "frente", nome: "Frente" },
  { id: "tras", nome: "Traseira" },
  { id: "lateral", nome: "Lateral" },
];

export function Vitrine3D({ cores, pecas }: { cores: CorIphone[]; pecas: InfoPeca[] }) {
  const palco = useRef<HTMLDivElement>(null);
  const moldura = useRef<HTMLDivElement>(null);
  const cena = useRef<Cena | null>(null);
  const alvoExplosao = useRef(0);
  const explosaoAtual = useRef(0);
  const [explosao, setExplosao] = useState(0);
  const [cor, setCor] = useState(cores[0]);
  const [girando, setGirando] = useState(true);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [sobre, setSobre] = useState<{ id: string; x: number; y: number } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [telaCheia, setTelaCheia] = useState(false);
  const selecionadaRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let liberar = () => {};

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const { criarIphone13 } = await import("@/lib/vitrine/iphone13");
      const el = palco.current;
      if (cancelado || !el) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      el.appendChild(renderer.domElement);
      renderer.domElement.style.touchAction = "none";

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const ambiente = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = ambiente;

      const camera = new THREE.PerspectiveCamera(30, el.clientWidth / el.clientHeight, 1, 3000);
      const controles = new OrbitControls(camera, renderer.domElement);
      controles.enableDamping = true;
      controles.dampingFactor = 0.08;
      controles.minDistance = 120;
      controles.maxDistance = 900;
      controles.autoRotate = true;
      controles.autoRotateSpeed = 1.2;
      controles.enablePan = false;

      const luz = new THREE.DirectionalLight("#ffffff", 1.6);
      luz.position.set(120, 220, 260);
      luz.castShadow = true;
      luz.shadow.mapSize.set(2048, 2048);
      luz.shadow.camera.left = -160;
      luz.shadow.camera.right = 160;
      luz.shadow.camera.top = 160;
      luz.shadow.camera.bottom = -160;
      luz.shadow.camera.far = 900;
      luz.shadow.bias = -0.0005;
      scene.add(luz);
      scene.add(new THREE.HemisphereLight("#ffffff", "#8a8f99", 0.5));

      const modelo = criarIphone13();
      scene.add(modelo.grupo);

      // Sombra suave no "chão" para o aparelho não parecer flutuando.
      const chao = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.ShadowMaterial({ opacity: 0.18 }));
      chao.rotation.x = -Math.PI / 2;
      chao.position.y = -98;
      chao.receiveShadow = true;
      scene.add(chao);

      const distancia = () => (el.clientWidth / el.clientHeight < 0.9 ? 520 : 380) * (1 + explosaoAtual.current * 0.7);
      const posicoes: Record<Vista, [number, number, number]> = {
        "tres-quartos": [0.55, 0.22, 0.8],
        frente: [0, 0, 1],
        tras: [0, 0, -1],
        lateral: [1, 0.05, 0.02],
        explodida: [0.92, 0.32, 0.5],
      };
      let animCamera: { de: Vector3; para: Vector3; t: number } | null = null;
      function irPara(v: Vista) {
        const [x, y, z] = posicoes[v];
        const para = new THREE.Vector3(x, y, z).normalize().multiplyScalar(distancia());
        animCamera = { de: camera.position.clone(), para, t: 0 };
      }
      camera.position.set(...posicoes["tres-quartos"]).normalize().multiplyScalar(distancia());

      const raycaster = new THREE.Raycaster();
      const ponteiro = new THREE.Vector2();
      function pecaEm(ev: PointerEvent) {
        const r = renderer.domElement.getBoundingClientRect();
        ponteiro.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ponteiro, camera);
        const atual = selecionadaRef.current;
        for (const hit of raycaster.intersectObject(modelo.grupo, true)) {
          let o: Object3D | null = hit.object;
          while (o && !o.userData.peca) o = o.parent;
          const id = o?.userData.peca as string | undefined;
          // Com uma peça em destaque, as outras ficam "fantasmas" e não bloqueiam o clique.
          if (id && (!atual || id === atual)) return id;
        }
        return null;
      }

      let inicioClique: { x: number; y: number } | null = null;
      const aoPressionar = (ev: PointerEvent) => (inicioClique = { x: ev.clientX, y: ev.clientY });
      const aoSoltar = (ev: PointerEvent) => {
        if (!inicioClique || Math.hypot(ev.clientX - inicioClique.x, ev.clientY - inicioClique.y) > 5) return;
        const id = pecaEm(ev);
        selecionar(id && id === selecionadaRef.current ? null : id ?? null);
      };
      const aoMover = (ev: PointerEvent) => {
        if (ev.pointerType !== "mouse" || ev.buttons) return;
        const id = pecaEm(ev);
        const r = renderer.domElement.getBoundingClientRect();
        setSobre(id ? { id, x: ev.clientX - r.left, y: ev.clientY - r.top } : null);
        renderer.domElement.style.cursor = id ? "pointer" : "grab";
      };
      const aoSair = () => setSobre(null);
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
      };
      const observador = new ResizeObserver(redimensionar);
      observador.observe(el);

      let quadro = 0;
      let ultimo = performance.now();
      const loop = (agora: number) => {
        quadro = requestAnimationFrame(loop);
        const dt = Math.min((agora - ultimo) / 1000, 0.1);
        ultimo = agora;
        const alvo = alvoExplosao.current;
        if (Math.abs(alvo - explosaoAtual.current) > 0.0005) {
          const antes = explosaoAtual.current;
          explosaoAtual.current += (alvo - explosaoAtual.current) * Math.min(dt * 6, 1);
          modelo.definirExplosao(explosaoAtual.current);
          // Afasta a câmera conforme as peças se separam, para tudo caber na tela.
          const fator = (1 + explosaoAtual.current * 0.7) / (1 + antes * 0.7);
          camera.position.multiplyScalar(fator);
          if (animCamera) {
            animCamera.de.multiplyScalar(fator);
            animCamera.para.multiplyScalar(fator);
          }
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

      cena.current = {
        modelo,
        irPara,
        girar(ligado) {
          controles.autoRotate = ligado;
        },
      };
      modelo.definirExplosao(explosaoAtual.current);
      setCarregando(false);

      liberar = () => {
        cancelAnimationFrame(quadro);
        observador.disconnect();
        renderer.domElement.removeEventListener("pointerdown", aoPressionar);
        renderer.domElement.removeEventListener("pointerup", aoSoltar);
        renderer.domElement.removeEventListener("pointermove", aoMover);
        renderer.domElement.removeEventListener("pointerleave", aoSair);
        controles.dispose();
        modelo.descartar();
        chao.geometry.dispose();
        chao.material.dispose();
        ambiente.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        cena.current = null;
      };
    })();

    return () => {
      cancelado = true;
      liberar();
    };
  }, []);

  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement === moldura.current);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  function selecionar(id: string | null) {
    selecionadaRef.current = id;
    setSelecionada(id);
    cena.current?.modelo.destacar(id);
  }

  function mudarExplosao(v: number, moverCamera = false) {
    alvoExplosao.current = v;
    setExplosao(v);
    // Ao abrir ou fechar pelos botões, leva a câmera ao melhor ângulo para ver as camadas.
    if (moverCamera && !girando) cena.current?.irPara(v >= 0.5 ? "explodida" : "tres-quartos");
  }

  function mudarCor(c: CorIphone) {
    setCor(c);
    cena.current?.modelo.definirCor(c);
  }

  function alternarGiro() {
    const novo = !girando;
    setGirando(novo);
    cena.current?.girar(novo);
  }

  function irPara(v: Vista) {
    if (girando) alternarGiro();
    cena.current?.irPara(v);
  }

  function alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen();
    else moldura.current?.requestFullscreen?.();
  }

  const info = pecas.find((p) => p.id === selecionada);
  const nomeSobre = sobre && pecas.find((p) => p.id === sobre.id)?.nome;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div
        ref={moldura}
        className={`vitrine-palco relative overflow-hidden rounded-[1.75rem] border border-zinc-200 ${telaCheia ? "rounded-none border-0" : "h-[min(72vh,46rem)] min-h-[26rem]"}`}
      >
        <div ref={palco} className="absolute inset-0" />
        {carregando && <div className="absolute inset-0 grid place-items-center text-sm text-zinc-500">Carregando modelo 3D…</div>}

        {sobre && nomeSobre && sobre.id !== selecionada && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[140%] rounded-full bg-zinc-900/85 px-3 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg backdrop-blur"
            style={{ left: sobre.x, top: sobre.y }}
          >
            {nomeSobre}
          </div>
        )}

        <div className="absolute top-4 left-4 flex flex-wrap gap-1 rounded-full bg-cartao/80 p-1 text-xs shadow-sm backdrop-blur-xl">
          {VISTAS.map((v) => (
            <button key={v.id} type="button" onClick={() => irPara(v.id)} className="rounded-full px-3 py-1.5 text-zinc-700 transition hover:bg-zinc-900/[0.06]">
              {v.nome}
            </button>
          ))}
        </div>

        <div className="absolute top-4 right-4 flex gap-1">
          <button
            type="button"
            onClick={alternarGiro}
            aria-pressed={girando}
            title={girando ? "Parar rotação" : "Girar automaticamente"}
            className={`grid size-9 place-items-center rounded-full shadow-sm backdrop-blur-xl transition ${girando ? "bg-azul text-white" : "bg-cartao/80 text-zinc-700"}`}
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round]" aria-hidden="true">
              <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={alternarTelaCheia}
            title={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
            className="grid size-9 place-items-center rounded-full bg-cartao/80 text-zinc-700 shadow-sm backdrop-blur-xl"
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round]" aria-hidden="true">
              {telaCheia ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
            </svg>
          </button>
        </div>

        <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center gap-3 rounded-2xl bg-cartao/80 px-4 py-3 shadow-sm backdrop-blur-xl sm:inset-x-auto sm:left-1/2 sm:w-[30rem] sm:-translate-x-1/2">
          <div className="flex rounded-full bg-zinc-900/[0.06] p-0.5 text-xs font-medium">
            <button type="button" onClick={() => mudarExplosao(0, true)} className={`rounded-full px-3 py-1.5 transition ${explosao < 0.5 ? "bg-cartao shadow-sm" : "text-zinc-600"}`}>
              Montado
            </button>
            <button type="button" onClick={() => mudarExplosao(1, true)} className={`rounded-full px-3 py-1.5 transition ${explosao >= 0.5 ? "bg-cartao shadow-sm" : "text-zinc-600"}`}>
              Explodido
            </button>
          </div>
          <label className="flex min-w-40 flex-1 items-center gap-2 text-xs text-zinc-500">
            <span className="sr-only">Separação das peças</span>
            <input type="range" min={0} max={1} step={0.01} value={explosao} onChange={(e) => mudarExplosao(Number(e.target.value))} className="w-full accent-[var(--color-azul)]" />
          </label>
        </div>

        {telaCheia && info && <CartaoPeca info={info} onFechar={() => selecionar(null)} className="absolute top-16 right-4 w-80" />}
      </div>

      <aside className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold">Cor</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {cores.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => mudarCor(c)}
                title={c.nome}
                aria-label={c.nome}
                aria-pressed={c.id === cor.id}
                className={`size-8 rounded-full border border-black/10 shadow-inner transition ${c.id === cor.id ? "ring-2 ring-azul ring-offset-2 ring-offset-zinc-50" : ""}`}
                style={{ background: `linear-gradient(135deg, ${c.traseira}, ${c.aro})` }}
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">{cor.nome}</p>
        </div>

        {info ? (
          <CartaoPeca info={info} onFechar={() => selecionar(null)} />
        ) : (
          <p className="rounded-lg bg-cartao p-4 text-sm text-zinc-500">Toque em uma peça no modelo ou na lista abaixo para ver o que ela faz.</p>
        )}

        <div>
          <h2 className="text-sm font-semibold">Peças</h2>
          <ul className="mt-2 divide-y divide-zinc-200 overflow-hidden rounded-lg bg-cartao text-sm">
            {pecas.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    selecionar(p.id === selecionada ? null : p.id);
                    if (p.id !== selecionada && explosao < 0.5) mudarExplosao(1, true);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition ${p.id === selecionada ? "bg-azul/10 font-medium text-azul" : "hover:bg-zinc-900/[0.03]"}`}
                >
                  {p.nome}
                  <span aria-hidden="true" className="text-zinc-400">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function CartaoPeca({ info, onFechar, className = "" }: { info: InfoPeca; onFechar: () => void; className?: string }) {
  return (
    <div className={`rounded-lg bg-cartao p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">{info.nome}</h2>
        <button type="button" onClick={onFechar} className="text-xs text-link hover:underline">
          Ver todas
        </button>
      </div>
      <p className="mt-2 text-sm text-zinc-600">{info.descricao}</p>
      <ul className="mt-3 space-y-1 text-sm text-zinc-700">
        {info.detalhes.map((d) => (
          <li key={d} className="flex gap-2">
            <span className="text-azul">•</span>
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}
