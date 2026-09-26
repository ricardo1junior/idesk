"use client";

import { useActionState, useState } from "react";
import { salvarCliente } from "@/app/clientes/actions";
import type { EstadoFormulario } from "@/lib/clientes";
import { formatarCep, formatarDocumento, somenteDigitos } from "@/lib/documentos";

type Props = {
  id?: string;
  inicial?: Record<string, string>;
};

const UFS = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ");

export function ClienteForm({ id, inicial = {} }: Props) {
  const [estado, acao, salvando] = useActionState<EstadoFormulario, FormData>(
    salvarCliente.bind(null, id ?? null),
    {},
  );
  const v = { ...inicial, ...estado.valores };
  const [tipo, setTipo] = useState(v.tipo ?? "PF");
  const [endereco, setEndereco] = useState({
    cep: v.cep ? formatarCep(v.cep) : "",
    logradouro: v.logradouro ?? "",
    bairro: v.bairro ?? "",
    cidade: v.cidade ?? "",
    uf: v.uf ?? "",
  });
  const [buscandoCep, setBuscandoCep] = useState(false);
  const erro = (campo: string) => estado.erros?.[campo];

  async function buscarCep(cep: string) {
    const digitos = somenteDigitos(cep);
    if (digitos.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await r.json();
      if (!dados.erro) {
        setEndereco((e) => ({
          ...e,
          logradouro: dados.logradouro || e.logradouro,
          bairro: dados.bairro || e.bairro,
          cidade: dados.localidade || e.cidade,
          uf: dados.uf || e.uf,
        }));
      }
    } catch {
      // Sem internet ou ViaCEP fora do ar: o usuário preenche à mão.
    } finally {
      setBuscandoCep(false);
    }
  }

  const pf = tipo === "PF";

  return (
    <form action={acao} className="space-y-6">
      <fieldset className="flex gap-2">
        {(["PF", "PJ"] as const).map((t) => (
          <label
            key={t}
            className={`cursor-pointer rounded-md border px-4 py-2 text-sm ${
              tipo === t ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white"
            }`}
          >
            <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
            {t === "PF" ? "Pessoa física" : "Pessoa jurídica"}
          </label>
        ))}
      </fieldset>

      <Secao titulo="Identificação">
        <Campo label={pf ? "Nome completo" : "Razão social"} erro={erro("nome")} className="sm:col-span-2">
          <input name="nome" defaultValue={v.nome} required />
        </Campo>
        {!pf && (
          <Campo label="Nome fantasia" className="sm:col-span-2">
            <input name="nomeFantasia" defaultValue={v.nomeFantasia} />
          </Campo>
        )}
        <Campo label={pf ? "CPF" : "CNPJ"} erro={erro("documento")}>
          <input
            name="documento"
            defaultValue={v.documento ? formatarDocumento(v.documento) : ""}
            inputMode="numeric"
            placeholder={pf ? "000.000.000-00" : "00.000.000/0000-00"}
            onBlur={(e) => (e.target.value = formatarDocumento(e.target.value))}
            required
          />
        </Campo>
        {pf ? (
          <>
            <Campo label="RG">
              <input name="rg" defaultValue={v.rg} />
            </Campo>
            <Campo label="Data de nascimento">
              <input name="dataNascimento" type="date" defaultValue={v.dataNascimento} />
            </Campo>
          </>
        ) : (
          <>
            <Campo label="Inscrição estadual" dica='Use "ISENTO" se não tiver'>
              <input name="inscricaoEstadual" defaultValue={v.inscricaoEstadual} />
            </Campo>
            <Campo label="Inscrição municipal">
              <input name="inscricaoMunicipal" defaultValue={v.inscricaoMunicipal} />
            </Campo>
          </>
        )}
      </Secao>

      <Secao titulo="Contato">
        <Campo label="Telefone">
          <input name="telefone" type="tel" defaultValue={v.telefone} />
        </Campo>
        <Campo label="WhatsApp">
          <input name="whatsapp" type="tel" defaultValue={v.whatsapp} />
        </Campo>
        <Campo label="E-mail" erro={erro("email")} className="sm:col-span-2">
          <input name="email" type="email" defaultValue={v.email} />
        </Campo>
      </Secao>

      <Secao titulo="Endereço">
        <Campo label="CEP" dica={buscandoCep ? "Buscando endereço..." : undefined}>
          <input
            name="cep"
            inputMode="numeric"
            value={endereco.cep}
            onChange={(e) => setEndereco({ ...endereco, cep: e.target.value })}
            onBlur={(e) => {
              setEndereco({ ...endereco, cep: formatarCep(e.target.value) });
              buscarCep(e.target.value);
            }}
          />
        </Campo>
        <Campo label="Logradouro" className="sm:col-span-2">
          <input name="logradouro" value={endereco.logradouro} onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })} />
        </Campo>
        <Campo label="Número">
          <input name="numero" defaultValue={v.numero} />
        </Campo>
        <Campo label="Complemento">
          <input name="complemento" defaultValue={v.complemento} />
        </Campo>
        <Campo label="Bairro">
          <input name="bairro" value={endereco.bairro} onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })} />
        </Campo>
        <Campo label="Cidade">
          <input name="cidade" value={endereco.cidade} onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })} />
        </Campo>
        <Campo label="UF">
          <select name="uf" value={endereco.uf} onChange={(e) => setEndereco({ ...endereco, uf: e.target.value })}>
            <option value="" />
            {UFS.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
        </Campo>
      </Secao>

      <Secao titulo="Observações">
        <Campo label="Anotações internas" className="sm:col-span-4">
          <textarea name="observacoes" rows={3} defaultValue={v.observacoes} />
        </Campo>
      </Secao>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={salvando} className="btn-primario">
          {salvando ? "Salvando..." : "Salvar cliente"}
        </button>
        {estado.erros && <span className="text-sm text-red-600">Corrija os campos destacados.</span>}
      </div>
    </form>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">{titulo}</h2>
      <div className="grid gap-4 sm:grid-cols-4">{children}</div>
    </section>
  );
}

function Campo({
  label,
  erro,
  dica,
  className = "",
  children,
}: {
  label: string;
  erro?: string;
  dica?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`campo ${erro ? "campo-erro" : ""} ${className}`}>
      <span>{label}</span>
      {children}
      {erro ? <small className="text-red-600">{erro}</small> : dica && <small className="text-zinc-500">{dica}</small>}
    </label>
  );
}
