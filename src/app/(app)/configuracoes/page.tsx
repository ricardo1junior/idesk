import { exigirUsuario } from "@/lib/auth";
import { configLoja } from "@/lib/loja";
import { FormConfigLoja } from "./FormConfigLoja";

export default async function Configuracoes() {
  await exigirUsuario("configuracoes");
  const c = await configLoja();
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Configurações da loja</h1>
      <FormConfigLoja
        inicial={{
          endereco: c.endereco ?? "",
          abreAs: c.abreAs,
          fechaAs: c.fechaAs,
          diasSemana: c.diasSemana,
          duracaoAtendimento: String(c.duracaoAtendimento),
          atendimentosSimultaneos: String(c.atendimentosSimultaneos),
          minutosNoLocalEntrega: String(c.minutosNoLocalEntrega),
        }}
      />
    </div>
  );
}
