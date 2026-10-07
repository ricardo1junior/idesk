import { Vitrine3D } from "@/components/Vitrine3D";
import { exigirUsuario } from "@/lib/auth";

export const metadata = { title: "Vitrine 3D" };

export default async function Vitrine() {
  await exigirUsuario();

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vitrine 3D</h1>
          <p className="text-sm text-zinc-500">Mostre qualquer iPhone do XR ao mais recente: gire, troque a cor, abra a vista explodida e compare modelos lado a lado.</p>
        </div>
      </div>
      <Vitrine3D />
      <p className="text-xs text-zinc-400">Modelo ilustrativo para demonstração. Formas e posições das peças são aproximadas; medidas e especificações seguem as fichas da Apple.</p>
    </div>
  );
}
