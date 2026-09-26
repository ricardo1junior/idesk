"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { abrirOS, buscarClientes } from "@/app/(app)/os/actions";
import type { EstadoFormulario } from "@/lib/clientes";
import { formatarDocumento } from "@/lib/documentos";
import { ACESSORIOS, CHECKLIST, RESULTADOS_CHECKLIST, TIPOS_SENHA } from "@/lib/os";
import { Campo, Secao } from "./Campos";
import { FotosAparelho, fotosParaEnvio, type FotoEnviada } from "./FotosAparelho";
import { PadraoSenha } from "./PadraoSenha";
import { VerificarImei } from "./VerificarImei";

type ClienteResumo = { id: string; nome: string; documento: string };

export function OSForm({ cliente: clienteInicial }: { cliente?: ClienteResumo }) {
  const [estado, acao, salvando] = useActionState<EstadoFormulario, FormData>(abrirOS, {});
  const v = estado.valores ?? {};
  const erro = (campo: string) => estado.erros?.[campo];

  const [cliente, setCliente] = useState<ClienteResumo | undefined>(clienteInicial);
  const [tipoSenha, setTipoSenha] = useState(v.tipoSenha ?? "NENHUMA");
  const [senha, setSenha] = useState(v.senha ?? "");
  const [backup, setBackup] = useState(v.precisaBackup === "sim");
  const [imei, setImei] = useState(v.imei ?? "");
  const [fotos, setFotos] = useState<FotoEnviada[]>([]);

  return (
    <form action={acao} className="space-y-6">
      <Secao titulo="Cliente">
        <div className="sm:col-span-4">
          {cliente ? (
            <div className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="clienteId" value={cliente.id} />
              <div>
                <div className="font-medium">{cliente.nome}</div>
                <div className="font-mono text-xs text-zinc-500">{formatarDocumento(cliente.documento)}</div>
              </div>
              <button type="button" className="btn-secundario" onClick={() => setCliente(undefined)}>
                Trocar
              </button>
            </div>
          ) : (
            <BuscaCliente onSelecionar={setCliente} erro={erro("clienteId")} />
          )}
        </div>
      </Secao>

      <Secao titulo="Aparelho">
        <Campo label="Modelo" erro={erro("modelo")} className="sm:col-span-2">
          <input name="modelo" defaultValue={v.modelo} placeholder="ex.: iPhone 13 Pro" list="modelos" required />
        </Campo>
        <Campo label="Cor">
          <input name="cor" defaultValue={v.cor} />
        </Campo>
        <Campo label="Capacidade">
          <input name="capacidade" defaultValue={v.capacidade} placeholder="ex.: 128 GB" />
        </Campo>
        <Campo label="IMEI" erro={erro("imei")} dica="*#06# no teclado mostra o IMEI">
          <input name="imei" value={imei} onChange={(e) => setImei(e.target.value.trim())} inputMode="numeric" maxLength={15} />
        </Campo>
        <Campo label="Número de série">
          <input name="serial" defaultValue={v.serial} className="uppercase" />
        </Campo>
        <Campo label="Saúde da bateria (%)" erro={erro("saudeBateria")}>
          <input name="saudeBateria" defaultValue={v.saudeBateria} inputMode="numeric" />
        </Campo>
        <Campo label="Conta iCloud / Buscar ativo?">
          <select name="icloudBloqueado" defaultValue={v.icloudBloqueado ?? ""}>
            <option value="">Não verificado</option>
            <option value="sim">Sim, ativo</option>
            <option value="nao">Não, desativado</option>
          </select>
        </Campo>
        {imei.length === 15 && (
          <div className="sm:col-span-4">
            <VerificarImei imei={imei} />
          </div>
        )}
      </Secao>

      <Secao titulo="Senha do aparelho">
        <Campo label="Tipo de senha">
          <select
            name="tipoSenha"
            value={tipoSenha}
            onChange={(e) => {
              setTipoSenha(e.target.value);
              setSenha("");
            }}
          >
            {Object.entries(TIPOS_SENHA).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </Campo>
        {(tipoSenha === "NUMERICA" || tipoSenha === "ALFANUMERICA") && (
          <Campo label="Senha" erro={erro("senha")} dica="Fica guardada criptografada" className="sm:col-span-2">
            <input
              name="senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              inputMode={tipoSenha === "NUMERICA" ? "numeric" : "text"}
              autoComplete="off"
            />
          </Campo>
        )}
        {tipoSenha === "PADRAO" && (
          <div className="sm:col-span-3">
            <input type="hidden" name="senha" value={senha} />
            <PadraoSenha valor={senha} onChange={setSenha} />
            {erro("senha") && <small className="text-sm text-red-600">{erro("senha")}</small>}
          </div>
        )}
      </Secao>

      <Secao titulo="Checklist de entrada">
        <div className="grid gap-x-6 gap-y-2 sm:col-span-4 sm:grid-cols-2">
          {CHECKLIST.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 border-b border-zinc-100 py-1 text-sm">
              <span>{item.label}</span>
              <div className="flex gap-1">
                {Object.entries(RESULTADOS_CHECKLIST).map(([valor, label]) => (
                  <label key={valor} className="chip">
                    <input
                      type="radio"
                      name={`check_${item.id}`}
                      value={valor}
                      defaultChecked={(v[`check_${item.id}`] ?? "NAO_TESTADO") === valor}
                      className="peer sr-only"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Estado e acessórios">
        <Campo label="Marcas de uso" dica="Riscos, amassados, trincas já existentes" className="sm:col-span-4">
          <textarea name="marcasUso" rows={2} defaultValue={v.marcasUso} placeholder="ex.: risco na lateral esquerda, tampa traseira trincada" />
        </Campo>
        <div className="sm:col-span-4">
          <div className="mb-2 text-sm font-medium text-zinc-700">Acessórios deixados pelo cliente</div>
          <div className="flex flex-wrap gap-2">
            {ACESSORIOS.map((a) => (
              <label key={a} className="chip">
                <input type="checkbox" name="acessorios" value={a} className="peer sr-only" />
                <span>{a}</span>
              </label>
            ))}
          </div>
        </div>
        <Campo label="Outros acessórios" className="sm:col-span-2">
          <input name="acessoriosOutros" defaultValue={v.acessoriosOutros} />
        </Campo>
      </Secao>

      <Secao titulo="Fotos do aparelho">
        <div className="sm:col-span-4">
          <p className="mb-3 text-sm text-zinc-500">Fotografe o aparelho na frente do cliente, principalmente riscos, amassados e partes quebradas.</p>
          <input type="hidden" name="fotos" value={fotosParaEnvio(fotos)} />
          <FotosAparelho fotos={fotos} onChange={setFotos} />
        </div>
      </Secao>

      <Secao titulo="Backup">
        <label className="flex items-center gap-2 text-sm sm:col-span-4">
          <input type="checkbox" name="precisaBackup" value="sim" checked={backup} onChange={(e) => setBackup(e.target.checked)} />
          Cliente precisa de backup dos dados antes do serviço
        </label>
        {backup && (
          <Campo label="O que salvar / observações" className="sm:col-span-4">
            <input name="backupObs" defaultValue={v.backupObs} placeholder="ex.: fotos e WhatsApp; cliente autorizou uso do iCloud" />
          </Campo>
        )}
      </Secao>

      <Secao titulo="Atendimento">
        <Campo label="Defeito relatado pelo cliente" erro={erro("defeitoRelatado")} className="sm:col-span-4">
          <textarea name="defeitoRelatado" rows={3} defaultValue={v.defeitoRelatado} required />
        </Campo>
        <Campo label="Previsão de entrega">
          <input name="previsaoEntrega" type="date" defaultValue={v.previsaoEntrega} />
        </Campo>
        <Campo label="Garantia do serviço (dias)">
          <input name="garantiaDias" type="number" min={0} defaultValue={v.garantiaDias ?? "90"} />
        </Campo>
      </Secao>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={salvando} className="btn-primario">
          {salvando ? "Abrindo..." : "Abrir ordem de serviço"}
        </button>
        {estado.erros && <span className="text-sm text-red-600">Corrija os campos destacados.</span>}
      </div>

      <datalist id="modelos">
        {MODELOS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </form>
  );
}

export function BuscaCliente({ onSelecionar, erro }: { onSelecionar: (c: ClienteResumo) => void; erro?: string }) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ClienteResumo[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      buscarClientes(termo).then(setResultados);
    }, 250);
    return () => clearTimeout(t);
  }, [termo]);

  return (
    <div className="space-y-2">
      <label className={`campo ${erro ? "campo-erro" : ""}`}>
        <span>Buscar cliente</span>
        <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Nome, CPF/CNPJ ou telefone" />
        {erro && <small className="text-red-600">{erro}</small>}
      </label>
      {resultados.length > 0 && (
        <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
          {resultados.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onSelecionar(c)} className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50">
                {c.nome} <span className="font-mono text-xs text-zinc-500">{formatarDocumento(c.documento)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link href="/clientes/novo" className="text-sm text-zinc-600 underline">
        Cadastrar cliente novo
      </Link>
    </div>
  );
}

const MODELOS = [
  "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max", "iPhone SE (2ª geração)", "iPhone SE (3ª geração)",
  "iPhone 12", "iPhone 12 mini", "iPhone 12 Pro", "iPhone 12 Pro Max",
  "iPhone 13", "iPhone 13 mini", "iPhone 13 Pro", "iPhone 13 Pro Max",
  "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
  "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
  "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max", "iPhone 16e",
  "iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max", "iPhone Air",
  "iPad", "iPad Air", "iPad Pro", "iPad mini", "MacBook Air", "MacBook Pro", "iMac", "Apple Watch", "AirPods",
];
