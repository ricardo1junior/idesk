"use client";

import { formatarTelefone, somenteDigitos } from "@/lib/documentos";

// Número com DDI do Brasil (55) quando vier só com DDD.
export function numeroWhatsApp(telefone: string) {
  const d = somenteDigitos(telefone);
  return d.length <= 11 ? `55${d}` : d;
}

// No computador abre o WhatsApp Web; no celular, o aplicativo.
export function LinkWhatsApp({
  telefone,
  mensagem,
  className,
  children,
}: {
  telefone: string;
  mensagem?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const numero = numeroWhatsApp(telefone);
  const texto = mensagem ? `&text=${encodeURIComponent(mensagem)}` : "";
  const web = `https://web.whatsapp.com/send?phone=${numero}${texto}`;
  return (
    <a
      href={web}
      target="whatsapp"
      rel="noreferrer"
      title="Abrir no WhatsApp"
      className={className ?? "inline-flex items-center gap-1 text-link hover:underline"}
      onClick={(e) => {
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          e.preventDefault();
          window.location.href = `https://wa.me/${numero}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
        }
      }}
    >
      {children ?? (
        <>
          <IconeWhatsApp />
          {formatarTelefone(telefone)}
        </>
      )}
    </a>
  );
}

export function IconeWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-[#25d366]">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z" />
    </svg>
  );
}
