import { exigirUsuario } from "@/lib/auth";
import { empresaAtual, urlLogo } from "@/lib/empresa";
import { configLoja } from "@/lib/loja";
import { FormDadosLoja } from "./FormDadosLoja";
import { FormConfigLoja } from "./FormConfigLoja";

export default async function Configuracoes() {
  await exigirUsuario("configuracoes");
  const [c, e] = await Promise.all([configLoja(), empresaAtual()]);
  const txt = (v: string | number | null) => (v == null ? "" : String(v));
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Configurações da loja</h1>
      <FormDadosLoja
        logo={urlLogo(e)}
        inicial={{
          nome: e.nome,
          razaoSocial: txt(e.razaoSocial),
          documento: txt(e.documento),
          telefone: txt(e.telefone),
          email: txt(e.email),
          endereco: txt(e.endereco),
          site: txt(e.site),
          corDestaque: txt(e.corDestaque),
          smtpHost: txt(e.smtpHost),
          smtpPorta: txt(e.smtpPorta),
          smtpUsuario: txt(e.smtpUsuario),
          emailRemetente: txt(e.emailRemetente),
          smtpSeguro: e.smtpSeguro,
          temSenhaSmtp: !!e.smtpSenha,
        }}
      />
      <FormConfigLoja
        inicial={{
          endereco: c.endereco ?? "",
          abreAs: c.abreAs,
          fechaAs: c.fechaAs,
          diasSemana: c.diasSemana,
          duracaoAtendimento: String(c.duracaoAtendimento),
          atendimentosSimultaneos: String(c.atendimentosSimultaneos),
          minutosNoLocalEntrega: String(c.minutosNoLocalEntrega),
          motoboyTaxaFixa: Number(c.motoboyTaxaFixa).toFixed(2).replace(".", ","),
          motoboyValorKm: Number(c.motoboyValorKm).toFixed(2).replace(".", ","),
          motoboyMinutosRetirada: String(c.motoboyMinutosRetirada),
        }}
      />
    </div>
  );
}
