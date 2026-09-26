"use client";

import { useState, useTransition } from "react";

// Botão "Enviar por e-mail" com escolha entre os e-mails cadastrados do cliente.
export function EnviarEmail({ emails, enviar }: { emails: string[]; enviar: (para: string) => Promise<{ erro?: string; ok?: string }> }) {
  const [aberto, setAberto] = useState(false);
  const [para, setPara] = useState(emails[0] ?? "");
  const [msg, setMsg] = useState<{ erro?: string; ok?: string }>({});
  const [pendente, iniciar] = useTransition();

  if (!emails.length) {
    return (
      <button type="button" className="btn-secundario" disabled title="Cadastre um e-mail no cliente">
        Enviar por e-mail
      </button>
    );
  }
  if (!aberto) {
    return (
      <button type="button" className="btn-secundario" onClick={() => setAberto(true)}>
        Enviar por e-mail
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <select aria-label="E-mail do cliente" value={para} onChange={(e) => setPara(e.target.value)} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">
        {emails.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn-primario"
        disabled={pendente}
        onClick={() => {
          setMsg({});
          iniciar(async () => setMsg(await enviar(para)));
        }}
      >
        {pendente ? "Enviando…" : "Enviar"}
      </button>
      <button type="button" className="text-sm text-zinc-500 hover:underline" onClick={() => setAberto(false)}>
        Fechar
      </button>
      {msg.ok && <span className="w-full text-sm text-green-700">{msg.ok}</span>}
      {msg.erro && <span className="w-full max-w-sm text-sm text-red-600">{msg.erro}</span>}
    </div>
  );
}
