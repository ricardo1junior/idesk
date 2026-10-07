"use client";

import { useEffect, useRef, useState } from "react";

// Calendário para escolher um período qualquer: clica no primeiro dia e depois no último.
// Trabalha com datas "AAAA-MM-DD" (sem fuso), como os campos de data do sistema.

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

const ymd = (a: number, m: number, d: number) => `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const partes = (v: string) => v.split("-").map(Number) as [number, number, number];
export const formatarYmd = (v: string) => (v ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : "");

function hojeYmd() {
  const h = new Date();
  return ymd(h.getFullYear(), h.getMonth(), h.getDate());
}
function somarDias(v: string, n: number) {
  const [a, m, d] = partes(v);
  const x = new Date(a, m - 1, d + n);
  return ymd(x.getFullYear(), x.getMonth(), x.getDate());
}

type Props = { de: string; ate: string; onChange: (de: string, ate: string) => void; onAplicar?: () => void };

export function CalendarioPeriodo({ de, ate, onChange, onAplicar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [{ inicio, fim }, setFaixa] = useState({ inicio: de, fim: ate });
  const [sobre, setSobre] = useState<string | null>(null);
  const base = partes(de || hojeYmd());
  const [mes, setMes] = useState({ a: base[0], m: base[1] - 1 });
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => caixa.current && !caixa.current.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  function abrir() {
    setFaixa({ inicio: de, fim: ate });
    const [a, m] = partes(de || hojeYmd());
    setMes({ a, m: m - 1 });
    setAberto(true);
  }

  // 1º clique marca o início; 2º, o fim (se for antes do início, os dois trocam de lugar).
  function clicar(dia: string) {
    setFaixa((f) => (!f.inicio || f.fim ? { inicio: dia, fim: "" } : dia < f.inicio ? { inicio: dia, fim: f.inicio } : { inicio: f.inicio, fim: dia }));
  }

  function escolher(a: string, b: string) {
    setFaixa({ inicio: a, fim: b });
    const [ano, m] = partes(a);
    setMes({ a: ano, m: m - 1 });
  }

  function aplicar() {
    if (!inicio) return;
    onChange(inicio, fim || inicio);
    setAberto(false);
    // Deixa o React atualizar os campos antes de enviar o formulário.
    if (onAplicar) setTimeout(onAplicar, 0);
  }

  const mover = (n: number) => setMes(({ a, m }) => ({ a: a + Math.floor((m + n) / 12), m: (((m + n) % 12) + 12) % 12 }));
  const proximo = { a: mes.m === 11 ? mes.a + 1 : mes.a, m: (mes.m + 1) % 12 };
  const hoje = hojeYmd();
  const [ha, hm] = partes(hoje);
  const atalhos: [string, string, string][] = [
    ["Hoje", hoje, hoje],
    ["Últimos 7 dias", somarDias(hoje, -6), hoje],
    ["Últimos 30 dias", somarDias(hoje, -29), hoje],
    ["Este mês", ymd(ha, hm - 1, 1), ymd(ha, hm, 0)],
    ["Mês passado", ymd(ha, hm - 2, 1), ymd(ha, hm - 1, 0)],
    ["Este ano", ymd(ha, 0, 1), ymd(ha, 11, 31)],
  ].map(([r, a, b]) => {
    // ymd(ano, mês, 0) = último dia do mês anterior; normaliza pelo Date.
    const norm = (v: string) => somarDias(v, 0);
    return [r, norm(a), norm(b)];
  });

  // Fim provisório enquanto o mouse passa pelos dias (antes do segundo clique).
  const fimVisivel = fim || (inicio && sobre && sobre >= inicio ? sobre : "");

  const props = { inicio, fim: fimVisivel, hoje, onClicar: clicar, onSobre: setSobre };

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => (aberto ? setAberto(false) : abrir())}
        className="flex w-full items-center gap-2 rounded-md border border-zinc-300 bg-cartao px-3 py-2 text-left text-sm transition hover:border-zinc-400"
        aria-expanded={aberto}
      >
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 fill-none stroke-current stroke-2 text-zinc-500 [stroke-linecap:round]" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span className={de ? "" : "text-zinc-500"}>{de ? (de === ate || !ate ? formatarYmd(de) : `${formatarYmd(de)} a ${formatarYmd(ate)}`) : "Escolher no calendário"}</span>
      </button>

      {aberto && (
        <div className="absolute top-full left-0 z-40 mt-2 max-w-[calc(100vw-2rem)] rounded-2xl md:right-0 md:left-auto border border-zinc-200 bg-cartao p-4 shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex flex-row flex-wrap gap-1 md:w-36 md:flex-col">
              {atalhos.map(([r, a, b]) => (
                <button key={r} type="button" onClick={() => escolher(a, b)} className={`rounded-lg px-3 py-1.5 text-left text-xs transition ${inicio === a && fim === b ? "bg-azul/10 font-medium text-azul" : "hover:bg-zinc-900/[0.05]"}`}>
                  {r}
                </button>
              ))}
            </div>
            <div>
              <div className="relative flex gap-6">
                <button type="button" onClick={() => mover(-1)} aria-label="Mês anterior" className="absolute top-0 left-0 grid size-7 place-items-center rounded-full hover:bg-zinc-900/[0.06]">
                  ‹
                </button>
                <button type="button" onClick={() => mover(1)} aria-label="Próximo mês" className="absolute top-0 right-0 grid size-7 place-items-center rounded-full hover:bg-zinc-900/[0.06]">
                  ›
                </button>
                <Mes a={mes.a} m={mes.m} {...props} />
                <div className="hidden xl:block">
                  <Mes a={proximo.a} m={proximo.m} {...props} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3 text-sm">
                <span className="text-zinc-600">
                  {!inicio ? "Clique no primeiro dia" : !fim ? `De ${formatarYmd(inicio)}: agora clique no último dia` : `${formatarYmd(inicio)} a ${formatarYmd(fim)}`}
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAberto(false)} className="btn-secundario">
                    Cancelar
                  </button>
                  <button type="button" onClick={aplicar} disabled={!inicio} className="btn-primario">
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type PropsMes = { a: number; m: number; inicio: string; fim: string; hoje: string; onClicar: (dia: string) => void; onSobre: (dia: string | null) => void };

function Mes({ a, m, inicio, fim, hoje, onClicar, onSobre }: PropsMes) {
  const primeiro = new Date(a, m, 1).getDay();
  const dias = new Date(a, m + 1, 0).getDate();
  return (
    <div className="w-64">
      <div className="mb-2 text-center text-sm font-semibold">
        {MESES[m]} {a}
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-zinc-500">
        {SEMANA.map((s, i) => (
          <span key={i} className="py-1">
            {s}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center text-sm" onMouseLeave={() => onSobre(null)}>
        {Array.from({ length: primeiro }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: dias }, (_, i) => {
          const dia = ymd(a, m, i + 1);
          const ponta = dia === inicio || dia === fim;
          const dentro = inicio && fim && dia > inicio && dia < fim;
          return (
            <button
              key={dia}
              type="button"
              onClick={() => onClicar(dia)}
              onMouseEnter={() => onSobre(dia)}
              aria-label={formatarYmd(dia)}
              aria-pressed={ponta || !!dentro}
              className={`h-9 transition ${
                ponta ? "rounded-full bg-azul font-semibold text-white" : dentro ? "bg-azul/15 text-zinc-900" : "rounded-full hover:bg-zinc-900/[0.06]"
              } ${dia === hoje && !ponta ? "font-semibold text-azul" : ""}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
