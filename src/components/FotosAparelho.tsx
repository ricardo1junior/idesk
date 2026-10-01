"use client";

import { useRef, useState } from "react";
import { MAX_FOTOS_OS, TIPOS_FOTO, type TipoFotoChave } from "@/lib/fotos";

export type FotoEnviada = { id: string; tipo: TipoFotoChave; legenda: string; previa: string };

const LADO_MAXIMO = 1600;

class ErroFoto extends Error {}

// Reduz a foto no navegador (celular tira fotos de 4–12 MB) para JPEG de até 1600 px.
async function reduzir(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error("falha ao converter"))), "image/jpeg", 0.82));
}

export function FotosAparelho({
  fotos,
  onChange,
  maximo = MAX_FOTOS_OS,
}: {
  fotos: FotoEnviada[];
  /** Recebe uma função de atualização (como o setState do React): várias fotos chegam ao mesmo tempo. */
  onChange: (atualizar: (atuais: FotoEnviada[]) => FotoEnviada[]) => void;
  maximo?: number;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string>();
  const [tipoNovo, setTipoNovo] = useState<TipoFotoChave>("GERAL");

  async function adicionar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErro(undefined);
    const lista = [...arquivos].slice(0, Math.max(0, maximo - fotos.length));
    if (lista.length < arquivos.length) setErro(`Limite de ${maximo} fotos por OS.`);
    if (entrada.current) entrada.current.value = "";
    setEnviando((n) => n + lista.length);

    async function enviar(arquivo: File) {
      try {
        const blob = await reduzir(arquivo).catch(() => {
          throw new ErroFoto(`Não foi possível ler "${arquivo.name}". Use foto JPG ou PNG.`);
        });
        const form = new FormData();
        form.append("foto", blob, "foto.jpg");
        const resp = await fetch("/fotos-os", { method: "POST", body: form });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok || !json.id) throw new ErroFoto(json.erro ?? "Falha ao enviar a foto.");
        const nova: FotoEnviada = { id: json.id, tipo: tipoNovo, legenda: "", previa: URL.createObjectURL(blob) };
        // Atualização funcional: não desfaz legendas/remoções feitas enquanto a foto subia.
        onChange((atuais) => (atuais.length >= maximo ? atuais : [...atuais, nova]));
      } catch (e) {
        setErro(e instanceof ErroFoto ? e.message : "Falha ao enviar a foto. Verifique a conexão e tente de novo.");
      } finally {
        setEnviando((n) => n - 1);
      }
    }

    // Até 3 envios ao mesmo tempo.
    let proximo = 0;
    const trabalhador = async () => {
      while (proximo < lista.length) await enviar(lista[proximo++]);
    };
    await Promise.all(Array.from({ length: Math.min(3, lista.length) }, trabalhador));
  }

  const alterar = (id: string, parte: Partial<FotoEnviada>) => onChange((atuais) => atuais.map((f) => (f.id === id ? { ...f, ...parte } : f)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="campo">
          <span>Tipo das próximas fotos</span>
          <select value={tipoNovo} onChange={(e) => setTipoNovo(e.target.value as TipoFotoChave)}>
            {Object.entries(TIPOS_FOTO).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <input
          ref={entrada}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="sr-only"
          id="entrada-fotos"
          aria-label="Adicionar fotos do aparelho"
          onChange={(e) => adicionar(e.target.files)}
        />
        <label htmlFor="entrada-fotos" className={`btn-secundario cursor-pointer ${fotos.length >= maximo ? "pointer-events-none opacity-40" : ""}`}>
          📷 Tirar ou escolher fotos
        </label>
        {enviando > 0 && <span className="pb-2 text-sm text-zinc-500">Enviando {enviando} foto(s)…</span>}
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {fotos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {fotos.map((f) => (
            <li key={f.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-cartao">
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
              <img src={f.previa} alt={TIPOS_FOTO[f.tipo]} className="aspect-square w-full object-cover" />
              <div className="space-y-1 p-2">
                <select aria-label="Tipo do dano" value={f.tipo} onChange={(e) => alterar(f.id, { tipo: e.target.value as TipoFotoChave })} className="w-full rounded-md border border-zinc-300 px-2 py-1 text-xs">
                  {Object.entries(TIPOS_FOTO).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Legenda"
                  value={f.legenda}
                  maxLength={120}
                  placeholder="Onde? ex.: lateral esquerda"
                  onChange={(e) => alterar(f.id, { legenda: e.target.value })}
                  className="w-full rounded-md border border-zinc-300 px-2 py-1 text-xs"
                />
                <button type="button" className="text-xs text-zinc-500 hover:text-red-600" onClick={() => onChange((atuais) => atuais.filter((x) => x.id !== f.id))}>
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const fotosParaEnvio = (fotos: FotoEnviada[]) => JSON.stringify(fotos.map(({ id, tipo, legenda }) => ({ id, tipo, legenda })));
