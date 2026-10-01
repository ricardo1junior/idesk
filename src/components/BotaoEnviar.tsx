"use client";

import { useFormStatus } from "react-dom";

// Botão de formulário com server action: trava enquanto envia (evita clique duplo) e pode pedir confirmação.
export function BotaoEnviar({
  children,
  enviando,
  confirmar,
  className = "btn-primario",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { enviando?: React.ReactNode; confirmar?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      className={className}
      disabled={pending || props.disabled}
      aria-busy={pending || undefined}
      onClick={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
        props.onClick?.(e);
      }}
    >
      {pending && enviando ? enviando : children}
    </button>
  );
}
