"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Palco, PecaSob, Vista } from "@/lib/vitrine/palco";
import { MODELOS, modeloPorId, modelosPorAno, nomeMaterial, pecasDoModelo, type InfoPeca, type ModeloIphone } from "@/lib/vitrine/modelos";

type Modo = "explorar" | "comparar";
type Escolha = { id: string; cor: number };

const VISTAS: { id: Vista; nome: string }[] = [
  { id: "tres-quartos", nome: "Perspectiva" },
  { id: "frente", nome: "Frente" },
  { id: "tras", nome: "Traseira" },
  { id: "lateral", nome: "Lateral" },
];
const MAIS_NOVO = MODELOS.filter((m) => m.frente !== "dobravel").at(-1)!.id;

export function Vitrine3D() {
  const palcoEl = useRef<HTMLDivElement>(null);
  const moldura = useRef<HTMLDivElement>(null);
  const palco = useRef<Palco | null>(null);
  const [modo, setModo] = useState<Modo>("explorar");
  const [unico, setUnico] = useState<Escolha>({ id: MAIS_NOVO, cor: 0 });
  const [comparados, setComparados] = useState<Escolha[]>([
    { id: "iphone-13", cor: 0 },
    { id: MAIS_NOVO, cor: 0 },
  ]);
  const [explosao, setExplosao] = useState(0);
  const [fechado, setFechado] = useState(false);
  const [girando, setGirando] = useState(true);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [sobre, setSobre] = useState<PecaSob | null>(null);
  const [falar, setFalar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [telaCheia, setTelaCheia] = useState(false);
  const selecionadaRef = useRef<string | null>(null);

  const escolhas = modo === "explorar" ? [unico] : comparados;
  const modelos = escolhas.map((e) => modeloPorId(e.id)!);
  const temDobravel = modelos.some((m) => m.frente === "dobravel");
  const chave = escolhas.map((e) => e.id).join("|");

  // Peças de cada modelo e a lista combinada (no comparativo).
  const pecasPorModelo = useMemo(() => new Map(modelos.map((m) => [m.id, pecasDoModelo(m)])), [chave]); // eslint-disable-line react-hooks/exhaustive-deps
  const listaPecas = useMemo(() => {
    const vistas = new Map<string, InfoPeca>();
    for (const lista of pecasPorModelo.values()) for (const p of lista) if (!vistas.has(p.id)) vistas.set(p.id, p);
    return [...vistas.values()];
  }, [pecasPorModelo]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const { criarPalco } = await import("@/lib/vitrine/palco");
      if (cancelado || !palcoEl.current) return;
      palco.current = criarPalco(palcoEl.current, {
        aoPassar: setSobre,
        aoClicar: (p) => selecionar(p && p.peca === selecionadaRef.current ? null : (p?.peca ?? null)),
      });
      setCarregando(false);
    })();
    return () => {
      cancelado = true;
      palco.current?.descartar();
      palco.current = null;
    };
  }, []);

  // Remonta a cena quando muda o modelo (ou os modelos comparados).
  useEffect(() => {
    if (carregando || !palco.current) return;
    palco.current.definirAparelhos(escolhas.map((e) => ({ modelo: modeloPorId(e.id)!, cor: modeloPorId(e.id)!.cores[e.cor] ?? modeloPorId(e.id)!.cores[0] })));
    setSobre(null);
    // A vista explodida muda de ângulo entre um aparelho e vários lado a lado.
    if (explosao >= 0.5 && !girando) palco.current.irPara("explodida");
    if (selecionadaRef.current && !listaPecas.some((p) => p.id === selecionadaRef.current)) selecionar(null);
  }, [carregando, chave]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement === moldura.current);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  // Fala o nome da peça sob o mouse (opcional), em português.
  const pecaSobre = sobre ? pecasPorModelo.get(sobre.modelo)?.find((x) => x.id === sobre.peca) : undefined;
  const nomeSobre = pecaSobre?.nome ?? null;
  const falaSobre = pecaSobre ? [pecaSobre.nome, pecaSobre.resumo].filter(Boolean).join(". ") : null;
  useEffect(() => {
    if (!falar || !falaSobre || typeof speechSynthesis === "undefined") return;
    const t = setTimeout(() => {
      speechSynthesis.cancel();
      const fala = new SpeechSynthesisUtterance(falaSobre.replaceAll(" · ", ", "));
      fala.lang = "pt-BR";
      fala.rate = 1.05;
      const voz = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt-br"));
      if (voz) fala.voice = voz;
      speechSynthesis.speak(fala);
    }, 250);
    return () => clearTimeout(t);
  }, [falar, falaSobre]);

  function selecionar(id: string | null) {
    selecionadaRef.current = id;
    setSelecionada(id);
    palco.current?.destacar(id);
  }

  function mudarExplosao(v: number, moverCamera = false) {
    setExplosao(v);
    palco.current?.definirExplosao(v);
    if (v > 0 && fechado) mudarDobra(false);
    if (moverCamera && !girando) palco.current?.irPara(v >= 0.5 ? "explodida" : "tres-quartos");
  }

  function mudarDobra(f: boolean) {
    setFechado(f);
    palco.current?.definirDobra(f ? 1 : 0);
    if (f && explosao > 0) {
      setExplosao(0);
      palco.current?.definirExplosao(0);
    }
  }

  function alternarGiro() {
    const novo = !girando;
    setGirando(novo);
    palco.current?.girar(novo);
  }

  function irPara(v: Vista) {
    if (girando) alternarGiro();
    palco.current?.irPara(v);
  }

  function mudarCor(indice: number, cor: number) {
    const m = modelos[indice];
    palco.current?.definirCor(indice, m.cores[cor]);
    if (modo === "explorar") setUnico({ ...unico, cor });
    else setComparados(comparados.map((e, i) => (i === indice ? { ...e, cor } : e)));
  }

  function alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen();
    else moldura.current?.requestFullscreen?.();
  }

  const info = selecionada ? listaPecas.find((p) => p.id === selecionada) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full bg-zinc-900/[0.06] p-1 text-sm font-medium" role="tablist">
          {(["explorar", "comparar"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modo === m}
              onClick={() => setModo(m)}
              className={`rounded-full px-4 py-1.5 transition ${modo === m ? "bg-cartao shadow-sm" : "text-zinc-600"}`}
            >
              {m === "explorar" ? "Explorar" : "Comparar"}
            </button>
          ))}
        </div>
        {modo === "explorar" ? (
          <SeletorModelo valor={unico.id} onChange={(id) => setUnico({ id, cor: 0 })} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {comparados.map((e, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <span className="px-1 text-xs text-zinc-400">vs</span>}
                <SeletorModelo valor={e.id} onChange={(id) => setComparados(comparados.map((x, j) => (j === i ? { id, cor: 0 } : x)))} />
                {comparados.length > 2 && (
                  <button type="button" onClick={() => setComparados(comparados.filter((_, j) => j !== i))} className="px-1 text-zinc-400 hover:text-zinc-700" aria-label="Remover da comparação">
                    ×
                  </button>
                )}
              </div>
            ))}
            {comparados.length < 3 && (
              <button type="button" onClick={() => setComparados([...comparados, { id: "iphone-16", cor: 0 }])} className="btn-secundario text-sm">
                + Adicionar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div
          ref={moldura}
          className={`vitrine-palco relative overflow-hidden rounded-[1.75rem] border border-zinc-200 text-zinc-900 ${telaCheia ? "rounded-none border-0" : "h-[min(72vh,46rem)] min-h-[26rem]"}`}
        >
          <div ref={palcoEl} className="absolute inset-0" />
          {carregando && <div className="absolute inset-0 grid place-items-center text-sm text-zinc-500">Carregando modelo 3D…</div>}

          {sobre && nomeSobre && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[135%] rounded-xl bg-[#1d1d1f]/90 px-3 py-1.5 text-center whitespace-nowrap text-white shadow-lg ring-1 ring-white/10 backdrop-blur"
              style={{ left: sobre.x, top: sobre.y }}
            >
              <div className="text-sm font-semibold">{nomeSobre}</div>
              {pecaSobre?.resumo && <div className="mt-0.5 text-xs text-white/85">{pecaSobre.resumo}</div>}
              {modelos.length > 1 && <div className="text-[11px] opacity-75">{modeloPorId(sobre.modelo)?.nome}</div>}
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
            <BotaoIcone ativo={falar} onClick={() => setFalar(!falar)} titulo={falar ? "Parar de falar o nome das peças" : "Falar o nome da peça ao passar o mouse"}>
              <path d="M11 5 6 9H3v6h3l5 4V5z" />
              {falar ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6M21 9l-5 6" />}
            </BotaoIcone>
            <BotaoIcone ativo={girando} onClick={alternarGiro} titulo={girando ? "Parar rotação" : "Girar automaticamente"}>
              <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" />
            </BotaoIcone>
            <BotaoIcone ativo={false} onClick={alternarTelaCheia} titulo={telaCheia ? "Sair da tela cheia" : "Tela cheia"}>
              {telaCheia ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
            </BotaoIcone>
          </div>

          <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center gap-3 rounded-2xl bg-cartao/80 px-4 py-3 shadow-sm backdrop-blur-xl sm:inset-x-auto sm:left-1/2 sm:w-[34rem] sm:-translate-x-1/2">
            <Segmentado opcoes={["Montado", "Explodido"]} ativo={explosao >= 0.5 ? 1 : 0} onChange={(i) => mudarExplosao(i, true)} />
            <label className="flex min-w-32 flex-1 items-center gap-2 text-xs text-zinc-500">
              <span className="sr-only">Separação das peças</span>
              <input type="range" min={0} max={1} step={0.01} value={explosao} onChange={(e) => mudarExplosao(Number(e.target.value))} className="w-full accent-[var(--color-azul)]" />
            </label>
            {temDobravel && <Segmentado opcoes={["Aberto", "Fechado"]} ativo={fechado ? 1 : 0} onChange={(i) => mudarDobra(i === 1)} />}
          </div>

          {!sobre && !selecionada && !carregando && (
            <p className="pointer-events-none absolute top-16 left-1/2 hidden -translate-x-1/2 rounded-full bg-cartao/70 px-3 py-1 text-xs whitespace-nowrap text-zinc-500 backdrop-blur sm:block">Passe o mouse sobre o aparelho para ver o nome de cada peça</p>
          )}

          {telaCheia && info && <CartaoPeca info={info} modelos={modelos} pecasPorModelo={pecasPorModelo} onFechar={() => selecionar(null)} className="absolute top-16 right-4 w-80" />}
        </div>

        <aside className="space-y-5">
          {modelos.map((m, i) => (
            <div key={`${m.id}-${i}`}>
              <h2 className="text-sm font-semibold">{modelos.length > 1 ? `Cor do ${m.nome}` : "Cor"}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {m.cores.map((c, ci) => (
                  <button
                    key={c.nome}
                    type="button"
                    onClick={() => mudarCor(i, ci)}
                    title={c.nome}
                    aria-label={c.nome}
                    aria-pressed={ci === escolhas[i].cor}
                    className={`size-7 rounded-full border border-black/10 shadow-inner transition ${ci === escolhas[i].cor ? "ring-2 ring-azul ring-offset-2 ring-offset-zinc-50" : ""}`}
                    style={{ background: `linear-gradient(135deg, ${c.traseira}, ${c.aro})` }}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">{m.cores[escolhas[i].cor]?.nome}</p>
            </div>
          ))}

          {info ? (
            <CartaoPeca info={info} modelos={modelos} pecasPorModelo={pecasPorModelo} onFechar={() => selecionar(null)} />
          ) : (
            <p className="rounded-lg bg-cartao p-4 text-sm text-zinc-500">Toque em uma peça no modelo ou na lista abaixo para ver o que ela faz{modelos.length > 1 ? " em cada aparelho" : ""}.</p>
          )}

          <div>
            <h2 className="text-sm font-semibold">Peças</h2>
            <ul className="mt-2 max-h-[28rem] divide-y divide-zinc-200 overflow-auto rounded-lg bg-cartao text-sm">
              {listaPecas.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      selecionar(p.id === selecionada ? null : p.id);
                      if (p.id !== selecionada && explosao < 0.5) mudarExplosao(1, true);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition ${p.id === selecionada ? "bg-azul/10 font-medium text-azul" : "hover:bg-zinc-900/[0.03]"} ${sobre?.peca === p.id ? "bg-zinc-900/[0.04]" : ""}`}
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

      <FichaTecnica modelos={modelos} />
    </div>
  );
}

function SeletorModelo({ valor, onChange }: { valor: string; onChange: (id: string) => void }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)} aria-label="Modelo" className="rounded-full border border-zinc-300 bg-cartao px-4 py-1.5 text-sm font-medium outline-none focus:border-azul">
      {modelosPorAno().map((g) => (
        <optgroup key={g.ano} label={String(g.ano)}>
          {g.modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function Segmentado({ opcoes, ativo, onChange }: { opcoes: string[]; ativo: number; onChange: (i: number) => void }) {
  return (
    <div className="flex rounded-full bg-zinc-900/[0.06] p-0.5 text-xs font-medium">
      {opcoes.map((o, i) => (
        <button key={o} type="button" onClick={() => onChange(i)} className={`rounded-full px-3 py-1.5 transition ${ativo === i ? "bg-cartao shadow-sm" : "text-zinc-600"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function BotaoIcone({ ativo, onClick, titulo, children }: { ativo: boolean; onClick: () => void; titulo: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      title={titulo}
      aria-label={titulo}
      className={`grid size-9 place-items-center rounded-full shadow-sm backdrop-blur-xl transition ${ativo ? "bg-azul text-white" : "bg-cartao/80 text-zinc-700"}`}
    >
      <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

function CartaoPeca({
  info,
  modelos,
  pecasPorModelo,
  onFechar,
  className = "",
}: {
  info: InfoPeca;
  modelos: ModeloIphone[];
  pecasPorModelo: Map<string, InfoPeca[]>;
  onFechar: () => void;
  className?: string;
}) {
  return (
    <div className={`rounded-lg bg-cartao p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">{info.nome}</h2>
        <button type="button" onClick={onFechar} className="shrink-0 text-xs text-link hover:underline">
          Ver todas
        </button>
      </div>
      <p className="mt-2 text-sm text-zinc-600">{info.descricao}</p>
      {modelos.map((m) => {
        const daqui = pecasPorModelo.get(m.id)?.find((p) => p.id === info.id);
        return (
          <div key={m.id} className="mt-3">
            {modelos.length > 1 && <div className="text-xs font-semibold text-zinc-500">{m.nome}</div>}
            {daqui ? (
              <ul className="mt-1 space-y-1 text-sm text-zinc-700">
                {daqui.detalhes.map((d) => (
                  <li key={d} className="flex gap-2">
                    <span className="text-azul">•</span>
                    {d}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-zinc-400">Não tem esta peça.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

type Linha = { rotulo: string; valor: (m: ModeloIphone) => string; numero?: (m: ModeloIphone) => number; melhor?: "maior" | "menor" };

const FRENTE: Record<ModeloIphone["frente"], string> = {
  entalhe: "Entalhe (notch)",
  "entalhe-menor": "Entalhe menor",
  ilha: "Dynamic Island",
  "ilha-menor": "Dynamic Island menor",
  "botao-inicio": "Bordas com botão de início",
  dobravel: "Tela dobrável + tela externa",
};
const simNao = (b: boolean) => (b ? "Sim" : "Não");
const num = (n: number) => n.toLocaleString("pt-BR");

const LINHAS: { grupo: string; linhas: Linha[] }[] = [
  {
    grupo: "Geral",
    linhas: [
      { rotulo: "Lançamento", valor: (m) => m.lancamento },
      { rotulo: "Chip", valor: (m) => m.chip },
      { rotulo: "Armazenamento", valor: (m) => m.armazenamento },
      { rotulo: "Conectividade", valor: (m) => m.conectividade },
    ],
  },
  {
    grupo: "Tela",
    linhas: [
      { rotulo: "Tamanho", valor: (m) => `${num(m.tela.polegadas)}" ${m.tela.tipo}${m.telaExterna ? ` + externa de ${num(m.telaExterna.polegadas)}"` : ""}`, numero: (m) => m.tela.polegadas, melhor: "maior" },
      { rotulo: "Resolução", valor: (m) => `${m.tela.resolucao} · ${m.tela.ppi} ppi` },
      { rotulo: "Atualização", valor: (m) => (m.tela.hz > 60 ? "ProMotion até 120 Hz" : "60 Hz"), numero: (m) => m.tela.hz, melhor: "maior" },
      { rotulo: "Brilho máximo", valor: (m) => `${num(m.tela.brilhoPico)} nits`, numero: (m) => m.tela.brilhoPico, melhor: "maior" },
      { rotulo: "Frente", valor: (m) => FRENTE[m.frente] },
    ],
  },
  {
    grupo: "Câmeras",
    linhas: [
      { rotulo: "Traseiras", valor: (m) => m.camerasTexto.join("\n"), numero: (m) => m.camerasTexto.length, melhor: "maior" },
      { rotulo: "Zoom óptico", valor: (m) => m.zoomOptico },
      { rotulo: "Frontal", valor: (m) => m.frontal },
      { rotulo: "LiDAR", valor: (m) => simNao(m.lidar) },
    ],
  },
  {
    grupo: "Bateria",
    linhas: [
      { rotulo: "Capacidade", valor: (m) => `${num(m.bateriaMah)} mAh`, numero: (m) => m.bateriaMah, melhor: "maior" },
      { rotulo: "Vídeo", valor: (m) => `Até ${m.videoHoras} h`, numero: (m) => m.videoHoras, melhor: "maior" },
      { rotulo: "MagSafe", valor: (m) => simNao(m.magsafe) },
      { rotulo: "Porta", valor: (m) => m.porta },
    ],
  },
  {
    grupo: "Design",
    linhas: [
      { rotulo: "Dimensões", valor: (m) => `${num(m.altura)} × ${num(m.largura)} × ${num(m.espessura)} mm${m.frente === "dobravel" ? " (fechado)" : ""}` },
      { rotulo: "Espessura", valor: (m) => `${num(m.espessura)} mm`, numero: (m) => m.espessura, melhor: "menor" },
      { rotulo: "Peso", valor: (m) => `${m.peso} g`, numero: (m) => m.peso, melhor: "menor" },
      { rotulo: "Material", valor: (m) => nomeMaterial(m.material) },
      { rotulo: "Biometria", valor: (m) => m.biometria },
      { rotulo: "Botão de Ação", valor: (m) => simNao(m.botaoAcao) },
      { rotulo: "Controle da Câmera", valor: (m) => simNao(m.controleCamera) },
      { rotulo: "Resistência à água", valor: (m) => m.agua },
    ],
  },
];

function FichaTecnica({ modelos }: { modelos: ModeloIphone[] }) {
  const varios = modelos.length > 1;
  return (
    <section className="overflow-hidden rounded-lg bg-cartao">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <h2 className="font-semibold">{varios ? "Comparativo" : `Ficha técnica do ${modelos[0].nome}`}</h2>
        {varios && <span className="text-xs text-zinc-500">Em verde, o melhor de cada item</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          {varios && (
            <thead>
              <tr className="text-left">
                <th className="w-40 px-4 py-2" />
                {modelos.map((m, i) => (
                  <th key={`${m.id}-${i}`} className="px-4 py-2 font-semibold">
                    {m.nome}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          {LINHAS.map((g) => (
            <tbody key={g.grupo}>
              <tr>
                <th colSpan={modelos.length + 1} className="bg-zinc-50 px-4 py-1.5 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  {g.grupo}
                </th>
              </tr>
              {g.linhas.map((l) => {
                const valores = l.numero ? modelos.map(l.numero) : [];
                const alvo = l.melhor === "maior" ? Math.max(...valores) : Math.min(...valores);
                const diferentes = new Set(valores).size > 1;
                return (
                  <tr key={l.rotulo} className="border-t border-zinc-200/70 align-top">
                    <th className="w-40 px-4 py-2 text-left font-normal text-zinc-500">{l.rotulo}</th>
                    {modelos.map((m, i) => {
                      const melhor = varios && l.numero && diferentes && valores[i] === alvo;
                      return (
                        <td key={`${m.id}-${i}`} className={`px-4 py-2 whitespace-pre-line ${melhor ? "font-medium text-green-700" : ""}`}>
                          {l.valor(m)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}
