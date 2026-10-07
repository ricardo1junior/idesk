"use client";

import { useEffect } from "react";
import { aplicarMascara, type TipoMascara } from "@/lib/mascaras";

// Aplica a máscara de todo campo com data-mascara="..." enquanto a pessoa digita ou cola.
// Fica na raiz do app, então qualquer formulário (controlado ou não) ganha a máscara só com o atributo.
export function Mascaras() {
  useEffect(() => {
    const valorNativo = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    const aoDigitar = (ev: Event) => {
      const el = ev.target;
      if (!(el instanceof HTMLInputElement) || !el.dataset.mascara || !valorNativo) return;
      const antes = el.value;
      const depois = aplicarMascara(el.dataset.mascara as TipoMascara, antes);
      if (depois === antes) return;
      // Mantém o cursor na mesma posição relativa (contando só os caracteres que sobram).
      const cursor = el.selectionStart ?? antes.length;
      const relevantes = aplicarMascara(el.dataset.mascara as TipoMascara, antes.slice(0, cursor)).replace(/\W/g, "").length;
      // Setter nativo: o React percebe a mudança e o onChange recebe o valor já corrigido.
      valorNativo.call(el, depois);
      let pos = 0;
      for (let contados = 0; pos < depois.length && contados < relevantes; pos++) if (/\w/.test(depois[pos])) contados++;
      if (el.type !== "email" && el.type !== "number") el.setSelectionRange(pos, pos);
    };
    // Captura: roda antes do React ler o valor do campo.
    document.addEventListener("input", aoDigitar, true);
    return () => document.removeEventListener("input", aoDigitar, true);
  }, []);
  return null;
}
