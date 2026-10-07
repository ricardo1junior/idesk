"use client";

import {
  mascaraCep,
  mascaraCnpj,
  mascaraCpf,
  mascaraCpfCnpj,
  mascaraDesconto,
  mascaraDigitos,
  mascaraDinheiro,
  mascaraDinheiroComSinal,
  mascaraEmail,
  mascaraImei,
  mascaraNome,
  mascaraSerial,
  mascaraTelefone,
  mascaraUf,
} from "@/lib/mascaras";

// Cada máscara com o teclado e o limite de tamanho que combinam com ela.
const MASCARAS = {
  telefone: { aplicar: mascaraTelefone, type: "tel", inputMode: "tel", maxLength: 15, placeholder: "(11) 99999-9999" },
  email: { aplicar: mascaraEmail, type: "email", inputMode: "email", maxLength: 254, placeholder: undefined },
  nome: { aplicar: mascaraNome, type: "text", inputMode: "text", maxLength: 120, placeholder: undefined },
  cpf: { aplicar: mascaraCpf, type: "text", inputMode: "numeric", maxLength: 14, placeholder: "000.000.000-00" },
  cnpj: { aplicar: mascaraCnpj, type: "text", inputMode: "numeric", maxLength: 18, placeholder: "00.000.000/0000-00" },
  cpfCnpj: { aplicar: mascaraCpfCnpj, type: "text", inputMode: "numeric", maxLength: 18, placeholder: "CPF ou CNPJ" },
  cep: { aplicar: mascaraCep, type: "text", inputMode: "numeric", maxLength: 9, placeholder: "00000-000" },
  imei: { aplicar: mascaraImei, type: "text", inputMode: "numeric", maxLength: 15, placeholder: "15 dígitos" },
  serial: { aplicar: mascaraSerial, type: "text", inputMode: "text", maxLength: 20, placeholder: undefined },
  uf: { aplicar: mascaraUf, type: "text", inputMode: "text", maxLength: 2, placeholder: "SP" },
  dinheiro: { aplicar: mascaraDinheiro, type: "text", inputMode: "decimal", maxLength: 20, placeholder: "0,00" },
  dinheiroComSinal: { aplicar: mascaraDinheiroComSinal, type: "text", inputMode: "text", maxLength: 20, placeholder: "0,00" },
  desconto: { aplicar: mascaraDesconto, type: "text", inputMode: "decimal", maxLength: 20, placeholder: "R$ ou %" },
  porcentagem: { aplicar: mascaraDigitos(3), type: "text", inputMode: "numeric", maxLength: 3, placeholder: undefined },
  texto: { aplicar: (v: string) => v, type: "text", inputMode: "text", maxLength: undefined, placeholder: undefined },
  digitos: { aplicar: (v: string) => v.replace(/\D/g, ""), type: "text", inputMode: "numeric", maxLength: undefined, placeholder: undefined },
} as const;

export type TipoMascara = keyof typeof MASCARAS;

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "value"> & {
  mascara: TipoMascara;
  defaultValue?: string | null;
  value?: string;
};

/** <input> que formata enquanto o usuário digita (telefone, CPF, CEP...). Funciona com value ou defaultValue. */
export function Entrada({ mascara, defaultValue, value, onChange, ...props }: Props) {
  const m = MASCARAS[mascara];
  return (
    <input
      type={m.type}
      inputMode={m.inputMode}
      maxLength={m.maxLength}
      placeholder={m.placeholder}
      autoComplete={mascara === "email" ? "email" : mascara === "telefone" ? "tel" : undefined}
      {...props}
      {...(value !== undefined ? { value: m.aplicar(value) } : { defaultValue: defaultValue ? m.aplicar(defaultValue) : undefined })}
      onChange={(e) => {
        const formatado = m.aplicar(e.target.value);
        if (formatado !== e.target.value) e.target.value = formatado;
        onChange?.(e);
      }}
    />
  );
}
