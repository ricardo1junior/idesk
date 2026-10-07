"use client";

import { Fragment, useEffect, useRef, useState } from "react";

// Bolinha flutuante com o assistente de IA para dúvidas do mundo Apple.

type Mensagem = { papel: "usuario" | "assistente"; texto: string };

const SUGESTOES = [
  "Como transferir tudo de um iPhone antigo para um novo?",
  "Qual foi o preço de lançamento do iPhone 13 no Brasil?",
  "Como foi o lançamento do iPhone Duo?",
  "Como fazer backup do iPhone no iCloud e no computador?",
];
const CHAVE = "idesk-assistente";
const MARCA_BUSCA = "\u0000busca\u0000";

export function AssistenteIA() {
  const [aberto, setAberto] = useState(false);
  // Mantém a conversa enquanto a aba estiver aberta (o painel começa fechado, então não há diferença na hidratação).
  const [mensagens, setMensagens] = useState<Mensagem[]>(() => {
    try {
      return typeof window === "undefined" ? [] : (JSON.parse(sessionStorage.getItem(CHAVE) ?? "[]") as Mensagem[]);
    } catch {
      return [];
    }
  });
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pesquisando, setPesquisando] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const cancelar = useRef<AbortController | null>(null);

  useEffect(() => {
    if (enviando) return;
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(mensagens));
    } catch {}
  }, [mensagens, enviando]);

  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight });
  }, [mensagens, pesquisando, aberto]);

  useEffect(() => {
    if (aberto) setTimeout(() => campo.current?.focus(), 50);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  async function enviar(pergunta: string) {
    pergunta = pergunta.trim();
    if (!pergunta || enviando) return;
    const historico: Mensagem[] = [...mensagens, { papel: "usuario", texto: pergunta }];
    setMensagens([...historico, { papel: "assistente", texto: "" }]);
    setTexto("");
    setEnviando(true);
    const controle = new AbortController();
    cancelar.current = controle;
    let resposta = "";
    const atualizar = (t: string) => setMensagens([...historico, { papel: "assistente", texto: t }]);
    try {
      const r = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico.slice(-20) }),
        signal: controle.signal,
      });
      // Sem sessão, o servidor redireciona para a tela de login (resposta em HTML).
      if (r.redirected || r.url.includes("/login")) {
        atualizar("Sua sessão expirou. Entre de novo no sistema para usar o assistente.");
        return;
      }
      if (!r.ok || !r.body) {
        const erro = await r.json().catch(() => null);
        atualizar(erro?.erro ?? "Não consegui responder agora. Tente de novo.");
        return;
      }
      const leitor = r.body.getReader();
      const decodificador = new TextDecoder();
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        resposta += decodificador.decode(value, { stream: true });
        if (resposta.includes(MARCA_BUSCA)) {
          setPesquisando(true);
          resposta = resposta.replaceAll(MARCA_BUSCA, "");
        }
        if (resposta.trim()) setPesquisando(false);
        atualizar(resposta);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") atualizar(resposta + "\n\nA conexão caiu. Tente de novo.");
    } finally {
      setEnviando(false);
      setPesquisando(false);
      cancelar.current = null;
    }
  }

  function limpar() {
    cancelar.current?.abort();
    setMensagens([]);
  }

  return (
    <div className="print:hidden">
      {aberto && (
        <section
          role="dialog"
          aria-label="Assistente Apple"
          className="fixed inset-x-3 bottom-24 z-50 flex max-h-[min(40rem,calc(100vh-8rem))] flex-col overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-cartao shadow-2xl sm:inset-x-auto sm:right-6 sm:w-[24rem]"
        >
          <header className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3">
            <Icone className="size-8" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Assistente Apple</h2>
              <p className="text-xs text-zinc-500">Lançamentos, preços, backup e dicas</p>
            </div>
            {mensagens.length > 0 && (
              <button type="button" onClick={limpar} className="text-xs text-link hover:underline">
                Nova conversa
              </button>
            )}
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="grid size-7 place-items-center rounded-full text-zinc-500 hover:bg-zinc-900/[0.06]">
              ×
            </button>
          </header>

          <div ref={lista} className="min-h-48 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            {mensagens.length === 0 ? (
              <div className="space-y-3">
                <p className="text-zinc-600">Olá! Pergunte o que quiser sobre produtos Apple. Algumas ideias:</p>
                <div className="flex flex-col gap-2">
                  {SUGESTOES.map((s) => (
                    <button key={s} type="button" onClick={() => enviar(s)} className="rounded-xl border border-zinc-200 px-3 py-2 text-left text-zinc-700 transition hover:border-azul hover:text-azul">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              mensagens.map((m, i) =>
                m.papel === "usuario" ? (
                  <div key={i} className="ml-8 rounded-2xl rounded-br-md bg-azul px-3 py-2 whitespace-pre-wrap text-white">
                    {m.texto}
                  </div>
                ) : (
                  <div key={i} className="mr-4 rounded-2xl rounded-bl-md bg-zinc-100 px-3 py-2 text-zinc-800">
                    {m.texto ? (
                      <Texto texto={m.texto} />
                    ) : (
                      <span className="inline-flex items-center gap-2 text-zinc-500">
                        <Pontinhos />
                        {pesquisando ? "Pesquisando na web…" : "Pensando…"}
                      </span>
                    )}
                    {i === mensagens.length - 1 && enviando && m.texto && pesquisando && <div className="mt-1 text-xs text-zinc-500">Pesquisando na web…</div>}
                  </div>
                ),
              )
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="flex items-end gap-2 border-t border-zinc-200 p-3"
          >
            <textarea
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar(texto);
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Pergunte sobre iPhone, iPad, Mac…"
              aria-label="Sua pergunta"
              className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-zinc-300 bg-cartao px-3 py-2 text-sm outline-none focus:border-azul focus:ring-4 focus:ring-azul/20"
            />
            <button
              type="submit"
              disabled={enviando || !texto.trim()}
              aria-label="Enviar"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-azul text-white transition disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </form>
          <p className="px-4 pb-2 text-center text-[10px] text-zinc-400">A IA pode errar. Confira preços e dados importantes.</p>
        </section>
      )}

      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-label={aberto ? "Fechar assistente" : "Abrir assistente Apple"}
        aria-expanded={aberto}
        title="Assistente Apple"
        className="fixed right-4 bottom-4 z-50 grid size-14 place-items-center rounded-full shadow-xl ring-1 ring-black/5 transition hover:scale-105 active:scale-95 sm:right-6 sm:bottom-6"
        style={{ background: "conic-gradient(from 210deg, #0071e3, #7d5cff, #ff5fa2, #ff9f0a, #34c759, #0071e3)" }}
      >
        <span className="grid size-[3.1rem] place-items-center rounded-full bg-[#1d1d1f]/85 text-white backdrop-blur">
          {aberto ? (
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round]" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          ) : (
            <Brilho className="size-6" />
          )}
        </span>
      </button>
    </div>
  );
}

function Icone({ className = "" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full text-white ${className}`} style={{ background: "conic-gradient(from 210deg, #0071e3, #7d5cff, #ff5fa2, #ff9f0a, #34c759, #0071e3)" }}>
      <Brilho className="size-4" />
    </span>
  );
}

function Brilho({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`fill-current ${className}`} aria-hidden="true">
      <path d="M12 2.5c.4 3.9 2.6 6.1 6.5 6.5-3.9.4-6.1 2.6-6.5 6.5-.4-3.9-2.6-6.1-6.5-6.5 3.9-.4 6.1-2.6 6.5-6.5zM18.5 14c.2 1.9 1.1 2.8 3 3-1.9.2-2.8 1.1-3 3-.2-1.9-1.1-2.8-3-3 1.9-.2 2.8-1.1 3-3zM6 15.5c.15 1.4.85 2.1 2.25 2.25C6.85 17.9 6.15 18.6 6 20c-.15-1.4-.85-2.1-2.25-2.25C5.15 17.6 5.85 16.9 6 15.5z" />
    </svg>
  );
}

function Pontinhos() {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

// Formatação simples da resposta: parágrafos, listas, **negrito** e links.
function Texto({ texto }: { texto: string }) {
  const blocos = texto.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2 leading-relaxed">
      {blocos.map((b, i) => {
        const linhas = b.split("\n");
        const lista = linhas.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));
        if (lista) {
          const numerada = /^\s*\d/.test(linhas[0]);
          const Tag = numerada ? "ol" : "ul";
          return (
            <Tag key={i} className={`space-y-1 pl-5 ${numerada ? "list-decimal" : "list-disc"}`}>
              {linhas.map((l, j) => (
                <li key={j}>
                  <Inline texto={l.replace(/^\s*([-*•]|\d+[.)])\s+/, "")} />
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i}>
            {linhas.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Inline texto={l.replace(/^#{1,6}\s+/, "")} negrito={/^#{1,6}\s+/.test(l)} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Inline({ texto, negrito = false }: { texto: string; negrito?: boolean }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s)]+)/g);
  const conteudo = partes.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    const link = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="text-link underline">{link[1]}</a>;
    if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all text-link underline">{p}</a>;
    return <Fragment key={i}>{p}</Fragment>;
  });
  return negrito ? <strong>{conteudo}</strong> : <>{conteudo}</>;
}
