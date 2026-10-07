import { Vitrine3D } from "@/components/Vitrine3D";
import { exigirUsuario } from "@/lib/auth";
import { CORES_IPHONE13, PECAS_IPHONE13 } from "@/lib/vitrine/iphone13-dados";

export const metadata = { title: "Vitrine 3D" };

export default async function Vitrine() {
  await exigirUsuario();

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vitrine 3D</h1>
          <p className="text-sm text-zinc-500">Mostre o aparelho ao cliente: gire, troque a cor e abra a vista explodida para ver cada peça.</p>
        </div>
        <label className="campo">
          <span className="sr-only">Modelo</span>
          <select defaultValue="iphone-13" aria-label="Modelo" className="min-w-48">
            <option value="iphone-13">iPhone 13</option>
          </select>
        </label>
      </div>
      <Vitrine3D cores={CORES_IPHONE13} pecas={PECAS_IPHONE13} />
      <p className="text-xs text-zinc-400">Modelo ilustrativo para demonstração. Formas e posições das peças são aproximadas.</p>
    </div>
  );
}
