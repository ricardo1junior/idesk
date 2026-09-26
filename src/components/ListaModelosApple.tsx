import { MODELOS_APPLE, capacidadesDoModelo } from "@/lib/catalogo-apple";

/** Sugestões para <input list="modelos-apple">; o campo continua aceitando texto livre. */
export function ListaModelosApple({ id = "modelos-apple" }: { id?: string }) {
  return (
    <datalist id={id}>
      {MODELOS_APPLE.map((m) => (
        <option key={m.nome} value={m.nome}>
          {m.categoria}
        </option>
      ))}
    </datalist>
  );
}

export function ListaCapacidades({ id = "capacidades-apple", modelo }: { id?: string; modelo?: string }) {
  return (
    <datalist id={id}>
      {capacidadesDoModelo(modelo).map((c) => (
        <option key={c} value={c} />
      ))}
    </datalist>
  );
}
