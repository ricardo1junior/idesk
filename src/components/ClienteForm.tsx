"use client";

import { useActionState, useState } from "react";
import { salvarCliente } from "@/app/(app)/clientes/actions";
import type { EstadoFormulario } from "@/lib/clientes";
import { somenteDigitos } from "@/lib/documentos";
import { Campo, Secao } from "./Campos";
import { Entrada } from "./Entrada";

export type ContatoExtra = { tipo: "TELEFONE" | "EMAIL"; valor: string; rotulo: string; whatsapp: boolean };
export type EnderecoExtra = {
  rotulo: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

type Props = {
  id?: string;
  inicial?: Record<string, string>;
  contatosIniciais?: ContatoExtra[];
  enderecosIniciais?: EnderecoExtra[];
};

const enderecoVazio = (): EnderecoExtra => ({ rotulo: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" });

// Consulta o ViaCEP. Sem internet ou com o serviço fora do ar, devolve null e o usuário preenche à mão.
async function consultarCep(cep: string): Promise<{ logradouro: string; bairro: string; cidade: string; uf: string } | null> {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8) return null;
  try {
    const dados = await (await fetch(`https://viacep.com.br/ws/${digitos}/json/`)).json();
    return dados.erro ? null : { logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.localidade, uf: dados.uf };
  } catch {
    return null;
  }
}

const UFS = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ");

export function ClienteForm({ id, inicial = {}, contatosIniciais = [], enderecosIniciais = [] }: Props) {
  const [estado, acao, salvando] = useActionState<EstadoFormulario, FormData>(
    salvarCliente.bind(null, id ?? null),
    {},
  );
  const v = { ...inicial, ...estado.valores };
  const [tipo, setTipo] = useState(v.tipo ?? "PF");
  const [endereco, setEndereco] = useState({
    cep: v.cep ?? "",
    logradouro: v.logradouro ?? "",
    bairro: v.bairro ?? "",
    cidade: v.cidade ?? "",
    uf: v.uf ?? "",
  });
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [contatos, setContatos] = useState<ContatoExtra[]>(contatosIniciais);
  const [enderecos, setEnderecos] = useState<EnderecoExtra[]>(enderecosIniciais);
  const erro = (campo: string) => estado.erros?.[campo];

  async function buscarCep(cep: string) {
    setBuscandoCep(true);
    const dados = await consultarCep(cep);
    setBuscandoCep(false);
    if (dados) {
      setEndereco((e) => ({
        ...e,
        logradouro: dados.logradouro || e.logradouro,
        bairro: dados.bairro || e.bairro,
        cidade: dados.cidade || e.cidade,
        uf: dados.uf || e.uf,
      }));
    }
  }

  const alterarContato = (n: number, m: Partial<ContatoExtra>) => setContatos((a) => a.map((c, k) => (k === n ? { ...c, ...m } : c)));
  const alterarEndereco = (n: number, m: Partial<EnderecoExtra>) => setEnderecos((a) => a.map((e, k) => (k === n ? { ...e, ...m } : e)));

  const pf = tipo === "PF";

  return (
    <form action={acao} className="space-y-6">
      <input type="hidden" name="extras" value={JSON.stringify({ contatos, enderecos })} />
      <fieldset className="flex gap-2">
        {(["PF", "PJ"] as const).map((t) => (
          <label
            key={t}
            className={`cursor-pointer rounded-md border px-4 py-2 text-sm ${
              tipo === t ? "border-zinc-900 bg-zinc-900 text-zinc-50" : "border-zinc-300 bg-cartao"
            }`}
          >
            <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
            {t === "PF" ? "Pessoa física" : "Pessoa jurídica"}
          </label>
        ))}
      </fieldset>

      <Secao titulo="Identificação">
        <Campo label={pf ? "Nome completo" : "Razão social"} erro={erro("nome")} className="sm:col-span-2">
          <Entrada mascara={pf ? "nome" : "texto"} name="nome" defaultValue={v.nome} required />
        </Campo>
        {!pf && (
          <Campo label="Nome fantasia" className="sm:col-span-2">
            <input name="nomeFantasia" defaultValue={v.nomeFantasia} />
          </Campo>
        )}
        <Campo label={pf ? "CPF" : "CNPJ"} erro={erro("documento")}>
<Entrada mascara={pf ? "cpf" : "cnpj"} name="documento" defaultValue={v.documento} key={tipo} required />
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

      <Secao titulo="Contatos">
        <Campo label="Telefone principal" erro={erro("telefone")}>
          <Entrada mascara="telefone" name="telefone" defaultValue={v.telefone} />
        </Campo>
        <Campo label="WhatsApp" erro={erro("whatsapp")}>
          <Entrada mascara="telefone" name="whatsapp" defaultValue={v.whatsapp} />
        </Campo>
        <Campo label="E-mail principal" erro={erro("email")} className="sm:col-span-2">
          <Entrada mascara="email" name="email" defaultValue={v.email} />
        </Campo>

        {contatos.map((c, n) => (
          <div key={n} className="grid gap-3 border-t border-zinc-100 pt-3 sm:col-span-4 sm:grid-cols-[1fr_1.5fr_auto_auto]">
            <Campo label={c.tipo === "EMAIL" ? "E-mail adicional" : "Telefone adicional"} erro={erro(`contato${n}`)}>
              <Entrada
                mascara={c.tipo === "EMAIL" ? "email" : "telefone"}
                value={c.valor}
                onChange={(e) => alterarContato(n, { valor: e.target.value })}
              />
            </Campo>
            <Campo label="Descrição">
              <input value={c.rotulo} onChange={(e) => alterarContato(n, { rotulo: e.target.value })} placeholder="ex.: Trabalho, Esposa, Financeiro" />
            </Campo>
            {c.tipo === "TELEFONE" ? (
              <label className="flex items-center gap-2 pt-6 text-sm">
                <input type="checkbox" checked={c.whatsapp} onChange={(e) => alterarContato(n, { whatsapp: e.target.checked })} /> WhatsApp
              </label>
            ) : (
              <span />
            )}
            <button type="button" className="pt-6 text-sm text-zinc-500 hover:text-red-600" onClick={() => setContatos((a) => a.filter((_, k) => k !== n))}>
              Remover
            </button>
          </div>
        ))}
        <div className="flex gap-2 sm:col-span-4">
          <button type="button" className="btn-secundario" onClick={() => setContatos((a) => [...a, { tipo: "TELEFONE", valor: "", rotulo: "", whatsapp: false }])}>
            + Telefone
          </button>
          <button type="button" className="btn-secundario" onClick={() => setContatos((a) => [...a, { tipo: "EMAIL", valor: "", rotulo: "", whatsapp: false }])}>
            + E-mail
          </button>
        </div>
      </Secao>

      <Secao titulo="Endereço principal">
        <Campo label="CEP" erro={erro("cep")} dica={buscandoCep ? "Buscando endereço..." : undefined}>
          <Entrada
            mascara="cep"
            name="cep"
            value={endereco.cep}
            onChange={(e) => {
              setEndereco({ ...endereco, cep: e.target.value });
              if (somenteDigitos(e.target.value).length === 8) buscarCep(e.target.value);
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
        <Campo label="Cidade" erro={erro("cidade")}>
          <Entrada mascara="nome" name="cidade" value={endereco.cidade} onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })} />
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

      {enderecos.map((e, n) => (
        <Secao key={n} titulo={`Endereço adicional ${n + 1}`}>
          <Campo label="Descrição" className="sm:col-span-2">
            <input value={e.rotulo} onChange={(ev) => alterarEndereco(n, { rotulo: ev.target.value })} placeholder="ex.: Comercial, Entrega, Cobrança" />
          </Campo>
          <Campo label="CEP" erro={erro(`endereco${n}`)}>
            <Entrada
              mascara="cep"
              value={e.cep}
              onChange={async (ev) => {
                const cep = ev.target.value;
                alterarEndereco(n, { cep });
                if (somenteDigitos(cep).length !== 8) return;
                const dados = await consultarCep(cep);
                if (dados) alterarEndereco(n, dados);
              }}
            />
          </Campo>
          <div className="flex items-end justify-end">
            <button type="button" className="pb-2 text-sm text-zinc-500 hover:text-red-600" onClick={() => setEnderecos((a) => a.filter((_, k) => k !== n))}>
              Remover endereço
            </button>
          </div>
          <Campo label="Logradouro" className="sm:col-span-2">
            <input value={e.logradouro} onChange={(ev) => alterarEndereco(n, { logradouro: ev.target.value })} />
          </Campo>
          <Campo label="Número">
            <input value={e.numero} onChange={(ev) => alterarEndereco(n, { numero: ev.target.value })} />
          </Campo>
          <Campo label="Complemento">
            <input value={e.complemento} onChange={(ev) => alterarEndereco(n, { complemento: ev.target.value })} />
          </Campo>
          <Campo label="Bairro">
            <input value={e.bairro} onChange={(ev) => alterarEndereco(n, { bairro: ev.target.value })} />
          </Campo>
          <Campo label="Cidade">
            <Entrada mascara="nome" value={e.cidade} onChange={(ev) => alterarEndereco(n, { cidade: ev.target.value })} />
          </Campo>
          <Campo label="UF">
            <select value={e.uf} onChange={(ev) => alterarEndereco(n, { uf: ev.target.value })}>
              <option value="" />
              {UFS.map((uf) => (
                <option key={uf}>{uf}</option>
              ))}
            </select>
          </Campo>
        </Secao>
      ))}
      <button type="button" className="btn-secundario" onClick={() => setEnderecos((a) => [...a, enderecoVazio()])}>
        + Endereço adicional
      </button>

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
